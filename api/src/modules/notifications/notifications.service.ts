import { AuditAction } from '@/common/enums/audit-action.enum';
import { AuditTargetType } from '@/common/enums/audit-target-type.enum';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { SmsService } from '../sms/sms.service';
import { MailService } from '../mail/mail.service';
import { TenantsRepository } from '../tenants/tenants.repository';
import { TenantStatus } from '../tenants/entities/tenant.entity';
import { InvoicesRepository } from '../invoices/invoices.repository';
import { InvoiceStatus } from '../invoices/entities/invoice.entity';
import { SendBulkMessageDto } from './dto/send-bulk-message.dto';
import { SendBulkReminderDto } from './dto/send-bulk-reminder.dto';
import { SendNotificationDto } from './dto/send-notification.dto';
import { Notification, NotificationChannel, NotificationStatus, NotificationType } from './entities/notification.entity';
import { NotificationsRepository } from './notifications.repository';

@Injectable()
export class NotificationsService {
	private readonly logger = new Logger(NotificationsService.name);

	constructor(
		private readonly notificationsRepository: NotificationsRepository,
		private readonly tenantsRepository: TenantsRepository,
		private readonly invoicesRepository: InvoicesRepository,
		private readonly auditService: AuditService,
		private readonly smsService: SmsService,
		private readonly mailService: MailService,
		private readonly dataSource: DataSource,
	) {}

	async findAll({
		page = 1,
		limit = 10,
		tenantId,
		type,
		channel,
		status,
	}: {
		page: number;
		limit: number;
		tenantId?: string;
		type?: NotificationType;
		channel?: NotificationChannel;
		status?: NotificationStatus;
	}): Promise<{
		data: Notification[];
		pagination: {
			page: number;
			limit: number;
			total: number;
			totalPages: number;
		};
	}> {
		const skip = (page - 1) * limit;

		const queryBuilder = this.notificationsRepository
			.createQueryBuilder('notification')
			.leftJoinAndSelect('notification.tenant', 'tenant')
			.leftJoinAndSelect('tenant.user', 'user')
			.leftJoinAndSelect('notification.invoice', 'invoice')
			.orderBy('notification.createdAt', 'DESC')
			.skip(skip)
			.take(limit);

		if (tenantId) {
			queryBuilder.andWhere('notification.tenantId = :tenantId', { tenantId });
		}

		if (type) {
			queryBuilder.andWhere('notification.type = :type', { type });
		}

		if (channel) {
			queryBuilder.andWhere('notification.channel = :channel', { channel });
		}

		if (status) {
			queryBuilder.andWhere('notification.status = :status', { status });
		}

		const [notifications, total] = await queryBuilder.getManyAndCount();

		return {
			data: notifications,
			pagination: {
				page,
				limit,
				total,
				totalPages: Math.ceil(total / limit),
			},
		};
	}

	async findOne(notificationId: string): Promise<Notification> {
		const notification = await this.notificationsRepository.findOne({
			where: { notificationId },
			relations: { tenant: { user: true }, invoice: true },
		});

		if (!notification) {
			throw new NotFoundException('Notification not found');
		}

		return notification;
	}

	async send(dto: SendNotificationDto, userId: string): Promise<Notification> {
		// Load tenant with user for delivery
		const tenant = await this.tenantsRepository.findOne({
			where: { tenantId: dto.tenantId },
		});

		if (!tenant) {
			throw new NotFoundException('Tenant not found');
		}

		const user = tenant.user;
		let deliveryStatus = NotificationStatus.PENDING;
		let sentAt: Date | undefined;
		let failReason: string | undefined;
		const errors: string[] = [];

		// Attempt actual delivery and check return values
		if ((dto.channel === NotificationChannel.SMS || dto.channel === NotificationChannel.BOTH) && user?.phone) {
			const smsResult = await this.smsService.sendSms(user.phone, dto.message);
			if (!smsResult.success) {
				errors.push('SMS delivery failed');
			}
		}

		if ((dto.channel === NotificationChannel.EMAIL || dto.channel === NotificationChannel.BOTH) && user?.email) {
			const emailResult = await this.mailService.sendEmail({
				to: user.email,
				subject: dto.subject || 'RentFlow Notification',
				html: dto.message,
			});
			if (!emailResult) {
				errors.push('Email delivery failed');
			}
		}

		if (errors.length === 0) {
			deliveryStatus = NotificationStatus.SENT;
			sentAt = new Date();
		} else {
			deliveryStatus = NotificationStatus.FAILED;
			failReason = errors.join('; ');
			this.logger.error(`Notification delivery failed for tenant ${dto.tenantId}: ${failReason}`);
		}

		const queryRunner = this.dataSource.createQueryRunner();
		await queryRunner.connect();
		await queryRunner.startTransaction();

		let notification: Notification;

		try {
			notification = await queryRunner.manager.save(
				queryRunner.manager.create(Notification, {
					tenantId: dto.tenantId,
					invoiceId: dto.invoiceId,
					type: dto.type,
					channel: dto.channel,
					subject: dto.subject,
					message: dto.message,
					sentAt,
					status: deliveryStatus,
					failReason,
				}),
			);
			await queryRunner.commitTransaction();
		} catch (err) {
			await queryRunner.rollbackTransaction();
			throw err;
		} finally {
			await queryRunner.release();
		}

		await this.auditService.createLog({
			action: AuditAction.NOTIFICATION_SENT,
			performedBy: userId,
			targetType: AuditTargetType.NOTIFICATION,
			targetId: notification.notificationId,
			details: `Sent ${dto.type} notification via ${dto.channel} to tenant ${dto.tenantId} — ${deliveryStatus}`,
			metadata: {
				notificationId: notification.notificationId,
				tenantId: dto.tenantId,
				invoiceId: dto.invoiceId,
				type: dto.type,
				channel: dto.channel,
				status: deliveryStatus,
			},
		});

		return this.notificationsRepository.findOne({
			where: { notificationId: notification.notificationId },
			relations: { tenant: true, invoice: true },
		});
	}

	async sendBulkReminder(dto: SendBulkReminderDto, userId: string): Promise<{ count: number }> {
		const type = dto.type ?? NotificationType.PAYMENT_REMINDER;

		// Find all active tenants who have unpaid/overdue/partially paid invoices
		const tenantsWithUnpaidInvoices = await this.invoicesRepository
			.createQueryBuilder('invoice')
			.select('invoice.tenantId', 'tenantId')
			.addSelect('user.phone', 'phone')
			.addSelect('user.email', 'email')
			.innerJoin('invoice.tenant', 'tenant')
			.innerJoin('tenant.user', 'user')
			.where('invoice.status IN (:...statuses)', {
				statuses: [InvoiceStatus.UNPAID, InvoiceStatus.OVERDUE, InvoiceStatus.PARTIALLY_PAID],
			})
			.andWhere('tenant.status = :tenantStatus', { tenantStatus: TenantStatus.ACTIVE })
			.distinct(true)
			.getRawMany<{ tenantId: string; phone: string; email: string }>();

		if (tenantsWithUnpaidInvoices.length === 0) {
			return { count: 0 };
		}

		const notifications: Notification[] = [];

		for (const row of tenantsWithUnpaidInvoices) {
			let deliveryStatus = NotificationStatus.PENDING;
			let sentAt: Date | undefined;
			let failReason: string | undefined;
			const errors: string[] = [];

			// Attempt delivery and check return values
			if ((dto.channel === NotificationChannel.SMS || dto.channel === NotificationChannel.BOTH) && row.phone) {
				try {
					const smsResult = await this.smsService.sendSms(row.phone, dto.message);
					if (!smsResult.success) {
						errors.push('SMS delivery failed');
					}
				} catch (err) {
					errors.push(`SMS error: ${err instanceof Error ? err.message : 'Unknown error'}`);
					this.logger.error(`SMS send threw for tenant ${row.tenantId}`, err);
				}
			}

			if ((dto.channel === NotificationChannel.EMAIL || dto.channel === NotificationChannel.BOTH) && row.email) {
				try {
					const emailResult = await this.mailService.sendEmail({
						to: row.email,
						subject: dto.subject || 'RentFlow Payment Reminder',
						html: dto.message,
					});
					if (!emailResult) {
						errors.push('Email delivery failed');
					}
				} catch (err) {
					errors.push(`Email error: ${err instanceof Error ? err.message : 'Unknown error'}`);
					this.logger.error(`Email send threw for tenant ${row.tenantId}`, err);
				}
			}

			if (errors.length === 0) {
				deliveryStatus = NotificationStatus.SENT;
				sentAt = new Date();
			} else {
				deliveryStatus = NotificationStatus.FAILED;
				failReason = errors.join('; ');
				this.logger.error(`Bulk reminder delivery failed for tenant ${row.tenantId}: ${failReason}`);
			}

			const queryRunner = this.dataSource.createQueryRunner();
			await queryRunner.connect();
			await queryRunner.startTransaction();

			try {
				const notification = await queryRunner.manager.save(
					queryRunner.manager.create(Notification, {
						tenantId: row.tenantId,
						type,
						channel: dto.channel,
						subject: dto.subject,
						message: dto.message,
						sentAt,
						status: deliveryStatus,
						failReason,
					}),
				);
				await queryRunner.commitTransaction();
				notifications.push(notification);
			} catch (err) {
				await queryRunner.rollbackTransaction();
				this.logger.error(`Failed to save bulk reminder notification for tenant ${row.tenantId}: ${err.message}`);
			} finally {
				await queryRunner.release();
			}
		}

		await this.auditService.createLog({
			action: AuditAction.BULK_REMINDER_SENT,
			performedBy: userId,
			targetType: AuditTargetType.NOTIFICATION,
			details: `Sent bulk ${type} reminders via ${dto.channel} to ${notifications.length} tenants`,
			metadata: {
				type,
				channel: dto.channel,
				tenantCount: notifications.length,
				sent: notifications.filter(n => n.status === NotificationStatus.SENT).length,
				failed: notifications.filter(n => n.status === NotificationStatus.FAILED).length,
			},
		});

		return { count: notifications.length };
	}

	async sendBulkMessage(dto: SendBulkMessageDto, userId: string): Promise<{ count: number }> {
		// Find all active tenants with their contact info
		const activeTenants = await this.tenantsRepository
			.createQueryBuilder('tenant')
			.innerJoin('tenant.user', 'user')
			.select('tenant.tenantId', 'tenantId')
			.addSelect('user.phone', 'phone')
			.addSelect('user.email', 'email')
			.where('tenant.status = :status', { status: TenantStatus.ACTIVE })
			.getRawMany<{ tenantId: string; phone: string; email: string }>();

		if (activeTenants.length === 0) {
			return { count: 0 };
		}

		const notifications: Notification[] = [];

		for (const row of activeTenants) {
			let deliveryStatus = NotificationStatus.PENDING;
			let sentAt: Date | undefined;
			let failReason: string | undefined;
			const errors: string[] = [];

			if ((dto.channel === NotificationChannel.SMS || dto.channel === NotificationChannel.BOTH) && row.phone) {
				try {
					const smsResult = await this.smsService.sendSms(row.phone, dto.message);
					if (!smsResult.success) {
						errors.push('SMS delivery failed');
					}
				} catch (err) {
					errors.push(`SMS error: ${err instanceof Error ? err.message : 'Unknown error'}`);
					this.logger.error(`SMS send threw for tenant ${row.tenantId}`, err);
				}
			}

			if ((dto.channel === NotificationChannel.EMAIL || dto.channel === NotificationChannel.BOTH) && row.email) {
				try {
					const emailResult = await this.mailService.sendEmail({
						to: row.email,
						subject: dto.subject || 'Notice from RentFlow',
						html: dto.message,
					});
					if (!emailResult) {
						errors.push('Email delivery failed');
					}
				} catch (err) {
					errors.push(`Email error: ${err instanceof Error ? err.message : 'Unknown error'}`);
					this.logger.error(`Email send threw for tenant ${row.tenantId}`, err);
				}
			}

			if (errors.length === 0) {
				deliveryStatus = NotificationStatus.SENT;
				sentAt = new Date();
			} else {
				deliveryStatus = NotificationStatus.FAILED;
				failReason = errors.join('; ');
				this.logger.error(`Bulk message delivery failed for tenant ${row.tenantId}: ${failReason}`);
			}

			const queryRunner = this.dataSource.createQueryRunner();
			await queryRunner.connect();
			await queryRunner.startTransaction();

			try {
				const notification = await queryRunner.manager.save(
					queryRunner.manager.create(Notification, {
						tenantId: row.tenantId,
						type: NotificationType.GENERAL,
						channel: dto.channel,
						subject: dto.subject,
						message: dto.message,
						sentAt,
						status: deliveryStatus,
						failReason,
					}),
				);
				await queryRunner.commitTransaction();
				notifications.push(notification);
			} catch (err) {
				await queryRunner.rollbackTransaction();
				this.logger.error(`Failed to save bulk message notification for tenant ${row.tenantId}: ${err.message}`);
			} finally {
				await queryRunner.release();
			}
		}

		await this.auditService.createLog({
			action: AuditAction.BULK_MESSAGE_SENT,
			performedBy: userId,
			targetType: AuditTargetType.NOTIFICATION,
			details: `Sent bulk message via ${dto.channel} to ${notifications.length} tenants`,
			metadata: {
				channel: dto.channel,
				tenantCount: notifications.length,
				sent: notifications.filter(n => n.status === NotificationStatus.SENT).length,
				failed: notifications.filter(n => n.status === NotificationStatus.FAILED).length,
			},
		});

		return { count: notifications.length };
	}

	async resend(notificationId: string, userId: string): Promise<Notification> {
		const notification = await this.notificationsRepository.findOne({
			where: { notificationId },
			relations: { tenant: { user: true } },
		});

		if (!notification) {
			throw new NotFoundException('Notification not found');
		}

		const tenant = notification.tenant;
		const user = tenant?.user;

		if (!tenant || !user) {
			throw new NotFoundException('Tenant or user not found for this notification');
		}

		const errors: string[] = [];

		// Attempt delivery and check return values
		if ((notification.channel === NotificationChannel.SMS || notification.channel === NotificationChannel.BOTH) && user.phone) {
			const smsResult = await this.smsService.sendSms(user.phone, notification.message);
			if (!smsResult.success) {
				errors.push('SMS delivery failed');
			}
		}

		if ((notification.channel === NotificationChannel.EMAIL || notification.channel === NotificationChannel.BOTH) && user.email) {
			const emailResult = await this.mailService.sendEmail({
				to: user.email,
				subject: notification.subject || 'RentFlow Notification',
				html: notification.message,
			});
			if (!emailResult) {
				errors.push('Email delivery failed');
			}
		}

		const queryRunner = this.dataSource.createQueryRunner();
		await queryRunner.connect();
		await queryRunner.startTransaction();

		try {
			if (errors.length === 0) {
				await queryRunner.manager.update(Notification, { notificationId }, {
					status: NotificationStatus.SENT,
					sentAt: new Date(),
					failReason: null,
				} as any);
				this.logger.log(`Notification ${notificationId} resent successfully`);
			} else {
				const failReason = errors.join('; ');
				await queryRunner.manager.update(Notification, { notificationId }, {
					status: NotificationStatus.FAILED,
					failReason,
					retryCount: notification.retryCount + 1,
				} as any);
				this.logger.error(`Resend failed for notification ${notificationId}: ${failReason}`);
			}

			await queryRunner.commitTransaction();
		} catch (err) {
			await queryRunner.rollbackTransaction();
			this.logger.error(`Failed to update notification ${notificationId} after resend: ${err.message}`);
		} finally {
			await queryRunner.release();
		}

		await this.auditService.createLog({
			action: AuditAction.NOTIFICATION_SENT,
			performedBy: userId,
			targetType: AuditTargetType.NOTIFICATION,
			targetId: notificationId,
			details: `Manual resend of ${notification.type} notification via ${notification.channel} to tenant ${notification.tenantId} — ${errors.length === 0 ? 'success' : 'failed'}`,
			metadata: {
				notificationId,
				tenantId: notification.tenantId,
				channel: notification.channel,
				type: notification.type,
			},
		});

		return this.notificationsRepository.findOne({
			where: { notificationId },
			relations: { tenant: { user: true }, invoice: true },
		});
	}

	async delete(notificationId: string): Promise<void> {
		const notification = await this.notificationsRepository.findOne({
			where: { notificationId },
		});

		if (!notification) {
			throw new NotFoundException('Notification not found');
		}

		await this.notificationsRepository.delete(notificationId);
	}
}
