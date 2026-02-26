import { AuditAction } from '@/common/enums/audit-action.enum';
import { AuditTargetType } from '@/common/enums/audit-target-type.enum';
import { UserRole } from '@/common/enums/user-role.enum';
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { Expense, ExpenseCategory, ExpenseStatus } from '../expenses/entities/expense.entity';
import { MailService } from '../mail/mail.service';
import {
	Notification,
	NotificationChannel,
	NotificationStatus,
	NotificationType,
} from '../notifications/entities/notification.entity';
import { Role } from '../permissions/entities/role.entity';
import { Property } from '../properties/entities/property.entity';
import { SmsService } from '../sms/sms.service';
import { Tenant } from '../tenants/entities/tenant.entity';
import { User } from '../users/entities/user.entity';
import { CreateMaintenanceRequestDto } from './dto/create-maintenance-request.dto';
import { UpdateMaintenanceRequestDto } from './dto/update-maintenance-request.dto';
import { MaintenanceRequest } from './entities/maintenance-request.entity';
import { MaintenanceRepository } from './maintenance.repository';

const VALID_TRANSITIONS: Record<ExpenseStatus, ExpenseStatus[]> = {
	[ExpenseStatus.PENDING]: [ExpenseStatus.APPROVED, ExpenseStatus.IN_PROGRESS, ExpenseStatus.COMPLETED, ExpenseStatus.CANCELLED],
	[ExpenseStatus.APPROVED]: [ExpenseStatus.IN_PROGRESS, ExpenseStatus.COMPLETED, ExpenseStatus.CANCELLED],
	[ExpenseStatus.IN_PROGRESS]: [ExpenseStatus.COMPLETED, ExpenseStatus.CANCELLED],
	[ExpenseStatus.COMPLETED]: [],
	[ExpenseStatus.CANCELLED]: [],
};

@Injectable()
export class MaintenanceService {
	private readonly logger = new Logger(MaintenanceService.name);

	constructor(
		private readonly maintenanceRepository: MaintenanceRepository,
		private readonly auditService: AuditService,
		private readonly dataSource: DataSource,
		private readonly smsService: SmsService,
		private readonly mailService: MailService,
		@InjectRepository(Tenant)
		private readonly tenantRepository: Repository<Tenant>,
		@InjectRepository(User)
		private readonly userRepository: Repository<User>,
		@InjectRepository(Role)
		private readonly roleRepository: Repository<Role>,
		@InjectRepository(Notification)
		private readonly notificationRepository: Repository<Notification>,
		@InjectRepository(Expense)
		private readonly expenseRepository: Repository<Expense>,
		@InjectRepository(Property)
		private readonly propertyRepository: Repository<Property>,
	) {}

	async findTenantByUserId(userId: string): Promise<Tenant> {
		const tenant = await this.tenantRepository.findOne({ where: { userId } });
		if (!tenant) {
			throw new NotFoundException('No tenant account found for this user');
		}
		return tenant;
	}

	async create(dto: CreateMaintenanceRequestDto, userId: string): Promise<MaintenanceRequest> {
		let tenantId: string | null = dto.tenantId || null;
		let propertyId: string | null = dto.propertyId || null;

		if (tenantId) {
			// Path 1: tenantId provided explicitly (admin assigning to tenant)
			// Auto-derive propertyId from the tenant's unit if not provided
			if (!propertyId) {
				const tenant = await this.tenantRepository.findOne({
					where: { tenantId },
					relations: { unit: true },
				});
				if (tenant?.unit?.propertyId) {
					propertyId = tenant.unit.propertyId;
				}
			}
		} else {
			// Try to resolve tenant from JWT (Path 2: tenant creating their own request)
			const tenant = await this.tenantRepository.findOne({
				where: { userId },
				relations: { unit: true },
			});

			if (tenant) {
				tenantId = tenant.tenantId;
				if (!propertyId && tenant.unit?.propertyId) {
					propertyId = tenant.unit.propertyId;
				}
			} else if (propertyId) {
				// Path 3: Admin/manager creating general maintenance with propertyId only
				tenantId = null;
			} else {
				// Path 4: No tenantId, no propertyId, and caller is not a tenant
				throw new BadRequestException(
					'propertyId is required for non-tenant maintenance requests',
				);
			}
		}

		const queryRunner = this.dataSource.createQueryRunner();
		await queryRunner.connect();
		await queryRunner.startTransaction();

		let maintenanceRequest: MaintenanceRequest;

		try {
			maintenanceRequest = await queryRunner.manager.save(
				queryRunner.manager.create(MaintenanceRequest, {
					tenantId,
					propertyId,
					description: dto.description,
					category: dto.category,
					priority: dto.priority,
					photos: dto.photos,
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
			action: AuditAction.MAINTENANCE_REQUESTED,
			performedBy: userId,
			targetType: AuditTargetType.MAINTENANCE,
			targetId: maintenanceRequest.maintenanceRequestId,
			details: tenantId
				? `Maintenance request created for tenant ${tenantId}: ${dto.description}`
				: `General maintenance request created for property ${propertyId}: ${dto.description}`,
			metadata: {
				maintenanceRequestId: maintenanceRequest.maintenanceRequestId,
				tenantId,
				propertyId,
				category: dto.category,
				priority: dto.priority,
			},
		});

		const saved = await this.maintenanceRepository.findOne({
			where: { maintenanceRequestId: maintenanceRequest.maintenanceRequestId },
			relations: { tenant: { user: true }, property: true },
		});

		// Fire-and-forget landlord notification
		this.notifyLandlordOfNewRequest(saved).catch((err) =>
			this.logger.error('Failed to notify landlord of maintenance request', err),
		);

		return saved;
	}

	private async notifyLandlordOfNewRequest(request: MaintenanceRequest): Promise<void> {
		const landlordRole = await this.roleRepository.findOne({ where: { name: UserRole.LANDLORD } });
		if (!landlordRole) return;

		const landlords = await this.userRepository.find({ where: { roleId: landlordRole.roleId } });
		if (landlords.length === 0) return;

		const isGeneral = !request.tenant;
		const tenantName = request.tenant?.user
			? `${request.tenant.user.firstName || ''} ${request.tenant.user.lastName || ''}`.trim()
			: 'General / Property-level';
		const unitNumber = request.tenant?.unit?.unitNumber || 'N/A';
		const propertyName = request.property?.name || request.tenant?.unit?.property?.name || 'N/A';
		const category = request.category.replace(/_/g, ' ');
		const priority = request.priority.toUpperCase();

		const sourceLabel = isGeneral
			? `General request for ${propertyName}`
			: `${tenantName} (Unit ${unitNumber})`;

		const smsMessage =
			`New maintenance request from ${sourceLabel}. ` +
			`Category: ${category}. Priority: ${priority}. ` +
			`"${request.description.substring(0, 100)}"`;

		const emailSubject = `Maintenance Request — ${sourceLabel} — ${priority}`;
		const emailHtml = `
			<h2>New Maintenance Request</h2>
			<table style="border-collapse:collapse;width:100%;max-width:500px;">
				<tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Tenant</td><td style="padding:8px;border:1px solid #ddd;">${tenantName}</td></tr>
				${!isGeneral ? `<tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Unit</td><td style="padding:8px;border:1px solid #ddd;">${unitNumber}</td></tr>` : ''}
				<tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Property</td><td style="padding:8px;border:1px solid #ddd;">${propertyName}</td></tr>
				<tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Category</td><td style="padding:8px;border:1px solid #ddd;">${category}</td></tr>
				<tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Priority</td><td style="padding:8px;border:1px solid #ddd;">${priority}</td></tr>
				<tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Description</td><td style="padding:8px;border:1px solid #ddd;">${request.description}</td></tr>
			</table>
			<p style="margin-top:16px;color:#666;">Log in to RentFlow to review and update this request.</p>
		`;

		for (const landlord of landlords) {
			// Send SMS
			if (landlord.phone) {
				try {
					await this.smsService.sendSms(landlord.phone, smsMessage);
					if (request.tenantId) {
						await this.notificationRepository.save(
							this.notificationRepository.create({
								tenantId: request.tenantId,
								type: NotificationType.MAINTENANCE_UPDATE,
								channel: NotificationChannel.SMS,
								message: smsMessage,
								sentAt: new Date(),
								status: NotificationStatus.SENT,
							}),
						);
					}
				} catch (err) {
					this.logger.warn(`Failed to send maintenance SMS to landlord ${landlord.userId}`, err);
					if (request.tenantId) {
						await this.notificationRepository.save(
							this.notificationRepository.create({
								tenantId: request.tenantId,
								type: NotificationType.MAINTENANCE_UPDATE,
								channel: NotificationChannel.SMS,
								message: smsMessage,
								status: NotificationStatus.FAILED,
								failReason: err instanceof Error ? err.message : 'Unknown error',
							}),
						);
					}
				}
			}

			// Send Email
			if (landlord.email) {
				try {
					await this.mailService.sendEmail({
						to: landlord.email,
						subject: emailSubject,
						html: emailHtml,
					});
					if (request.tenantId) {
						await this.notificationRepository.save(
							this.notificationRepository.create({
								tenantId: request.tenantId,
								type: NotificationType.MAINTENANCE_UPDATE,
								channel: NotificationChannel.EMAIL,
								subject: emailSubject,
								message: emailHtml,
								sentAt: new Date(),
								status: NotificationStatus.SENT,
							}),
						);
					}
				} catch (err) {
					this.logger.warn(`Failed to send maintenance email to landlord ${landlord.userId}`, err);
					if (request.tenantId) {
						await this.notificationRepository.save(
							this.notificationRepository.create({
								tenantId: request.tenantId,
								type: NotificationType.MAINTENANCE_UPDATE,
								channel: NotificationChannel.EMAIL,
								subject: emailSubject,
								message: emailHtml,
								status: NotificationStatus.FAILED,
								failReason: err instanceof Error ? err.message : 'Unknown error',
							}),
						);
					}
				}
			}
		}
	}

	async findAll({
		page = 1,
		limit = 10,
		tenantId,
		propertyId,
		status,
		category,
	}: {
		page: number;
		limit: number;
		tenantId?: string;
		propertyId?: string;
		status?: ExpenseStatus;
		category?: ExpenseCategory;
	}): Promise<{
		data: MaintenanceRequest[];
		pagination: {
			page: number;
			limit: number;
			total: number;
			totalPages: number;
		};
	}> {
		const skip = (page - 1) * limit;

		const where: Record<string, unknown> = {};
		if (tenantId) where.tenantId = tenantId;
		if (propertyId) where.propertyId = propertyId;
		if (status) where.status = status;
		if (category) where.category = category;

		const [maintenanceRequests, total] = await this.maintenanceRepository.findAndCount({
			where,
			relations: {
				tenant: {
					user: true,
					unit: {
						property: true,
					},
				},
				property: true,
			},
			order: { createdAt: 'DESC' },
			skip,
			take: limit,
		});

		return {
			data: maintenanceRequests,
			pagination: {
				page,
				limit,
				total,
				totalPages: Math.ceil(total / limit),
			},
		};
	}

	async findOne(maintenanceRequestId: string): Promise<MaintenanceRequest> {
		const maintenanceRequest = await this.maintenanceRepository.findOne({
			where: { maintenanceRequestId },
			relations: {
				tenant: {
					user: true,
					unit: {
						property: true,
					},
				},
				property: true,
			},
		});

		if (!maintenanceRequest) {
			throw new NotFoundException('Maintenance request not found');
		}

		return maintenanceRequest;
	}

	async update(
		maintenanceRequestId: string,
		dto: UpdateMaintenanceRequestDto,
		userId: string,
	): Promise<MaintenanceRequest> {
		const maintenanceRequest = await this.findOne(maintenanceRequestId);

		// Validate status transition
		if (dto.status !== undefined && dto.status !== maintenanceRequest.status) {
			const allowed = VALID_TRANSITIONS[maintenanceRequest.status];
			if (!allowed || !allowed.includes(dto.status)) {
				throw new BadRequestException(
					`Cannot transition from "${maintenanceRequest.status}" to "${dto.status}"`,
				);
			}
		}

		const updateData: Partial<MaintenanceRequest> = {};

		if (dto.description !== undefined) updateData.description = dto.description;
		if (dto.category !== undefined) updateData.category = dto.category;
		if (dto.priority !== undefined) updateData.priority = dto.priority;
		if (dto.photos !== undefined) updateData.photos = dto.photos;
		if (dto.status !== undefined) updateData.status = dto.status;
		if (dto.resolvedAt !== undefined) updateData.resolvedAt = new Date(dto.resolvedAt);

		const previousStatus = maintenanceRequest.status;
		const newStatus = dto.status;

		const queryRunner = this.dataSource.createQueryRunner();
		await queryRunner.connect();
		await queryRunner.startTransaction();

		try {
			await queryRunner.manager.update(MaintenanceRequest, { maintenanceRequestId }, updateData as any);

			// Auto-create expense when completed with an expense amount
			let createdExpenseId: string | undefined;
			if (
				newStatus === ExpenseStatus.COMPLETED &&
				dto.expenseAmount !== undefined &&
				dto.expenseAmount > 0
			) {
				const propertyId = maintenanceRequest.propertyId || maintenanceRequest.tenant?.unit?.propertyId;
				if (propertyId) {
					const expense = this.expenseRepository.create({
						propertyId,
						category: maintenanceRequest.category,
						priority: maintenanceRequest.priority,
						description: `Maintenance: ${maintenanceRequest.description}`,
						amount: dto.expenseAmount,
						status: ExpenseStatus.COMPLETED,
						completedDate: new Date(),
						notes: `Auto-created from maintenance request ${maintenanceRequestId}`,
					});
					const savedExpense = await queryRunner.manager.save(expense);
					createdExpenseId = savedExpense.expenseId;
				}
			}

			await queryRunner.commitTransaction();

			// Audit log for expense creation (after commit)
			if (createdExpenseId) {
				this.auditService.createLog({
					action: AuditAction.EXPENSE_CREATED,
					performedBy: userId,
					targetType: AuditTargetType.EXPENSE,
					targetId: createdExpenseId,
					details: `Expense auto-created from maintenance request ${maintenanceRequestId}`,
					metadata: {
						expenseId: createdExpenseId,
						maintenanceRequestId,
						amount: dto.expenseAmount,
					},
				}).catch((err) => this.logger.error('Failed to audit expense creation', err));
			}
		} catch (err) {
			await queryRunner.rollbackTransaction();
			throw err;
		} finally {
			await queryRunner.release();
		}

		const isResolved = dto.status === ExpenseStatus.COMPLETED || dto.resolvedAt !== undefined;

		await this.auditService.createLog({
			action: isResolved ? AuditAction.MAINTENANCE_RESOLVED : AuditAction.MAINTENANCE_UPDATED,
			performedBy: userId,
			targetType: AuditTargetType.MAINTENANCE,
			targetId: maintenanceRequestId,
			details: isResolved
				? `Maintenance request ${maintenanceRequestId} resolved`
				: `Maintenance request ${maintenanceRequestId} updated`,
			metadata: {
				maintenanceRequestId,
				tenantId: maintenanceRequest.tenantId,
				updatedFields: Object.keys(updateData),
			},
		});

		// Fire-and-forget tenant notification on status change
		if (newStatus !== undefined && newStatus !== previousStatus) {
			this.notifyTenantOfStatusChange(maintenanceRequest, newStatus).catch((err) =>
				this.logger.error('Failed to notify tenant of maintenance status change', err),
			);
		}

		return this.findOne(maintenanceRequestId);
	}

	private async notifyTenantOfStatusChange(
		request: MaintenanceRequest,
		newStatus: ExpenseStatus,
	): Promise<void> {
		const tenant = request.tenant;
		if (!tenant?.user) return;

		const tenantName = `${tenant.user.firstName || ''} ${tenant.user.lastName || ''}`.trim();
		const category = request.category.replace(/_/g, ' ');

		const statusLabels: Record<string, string> = {
			[ExpenseStatus.APPROVED]: 'approved',
			[ExpenseStatus.IN_PROGRESS]: 'in progress',
			[ExpenseStatus.COMPLETED]: 'completed',
			[ExpenseStatus.CANCELLED]: 'cancelled',
		};
		const statusLabel = statusLabels[newStatus] || newStatus;

		const extraMessages: Record<string, string> = {
			[ExpenseStatus.APPROVED]: 'It will be attended to soon.',
			[ExpenseStatus.IN_PROGRESS]: 'Work is underway.',
			[ExpenseStatus.COMPLETED]: 'The issue has been resolved.',
			[ExpenseStatus.CANCELLED]: 'Contact your property manager for details.',
		};
		const extra = extraMessages[newStatus] || '';

		const smsMessage = `Your maintenance request (${category}) has been ${statusLabel}. ${extra}`;

		const statusBadgeColors: Record<string, string> = {
			[ExpenseStatus.APPROVED]: '#1890ff',
			[ExpenseStatus.IN_PROGRESS]: '#13c2c2',
			[ExpenseStatus.COMPLETED]: '#52c41a',
			[ExpenseStatus.CANCELLED]: '#8c8c8c',
		};
		const badgeColor = statusBadgeColors[newStatus] || '#666';

		const emailSubject = `Maintenance Request Update — ${statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)}`;
		const emailHtml = `
			<h2>Maintenance Request Update</h2>
			<p>Dear ${tenantName},</p>
			<table style="border-collapse:collapse;width:100%;max-width:500px;">
				<tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Category</td><td style="padding:8px;border:1px solid #ddd;">${category}</td></tr>
				<tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Description</td><td style="padding:8px;border:1px solid #ddd;">${request.description}</td></tr>
				<tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">New Status</td><td style="padding:8px;border:1px solid #ddd;"><span style="background:${badgeColor};color:#fff;padding:2px 8px;border-radius:4px;">${statusLabel.toUpperCase()}</span></td></tr>
			</table>
			<p style="margin-top:16px;">${extra}</p>
			<p style="color:#666;">Log in to RentFlow to view your maintenance requests.</p>
		`;

		// Send SMS
		if (tenant.user.phone) {
			try {
				await this.smsService.sendSms(tenant.user.phone, smsMessage);
				await this.notificationRepository.save(
					this.notificationRepository.create({
						tenantId: request.tenantId,
						type: NotificationType.MAINTENANCE_UPDATE,
						channel: NotificationChannel.SMS,
						message: smsMessage,
						sentAt: new Date(),
						status: NotificationStatus.SENT,
					}),
				);
			} catch (err) {
				this.logger.warn(`Failed to send maintenance SMS to tenant ${request.tenantId}`, err);
				await this.notificationRepository.save(
					this.notificationRepository.create({
						tenantId: request.tenantId,
						type: NotificationType.MAINTENANCE_UPDATE,
						channel: NotificationChannel.SMS,
						message: smsMessage,
						status: NotificationStatus.FAILED,
						failReason: err instanceof Error ? err.message : 'Unknown error',
					}),
				);
			}
		}

		// Send Email
		if (tenant.user.email) {
			try {
				await this.mailService.sendEmail({
					to: tenant.user.email,
					subject: emailSubject,
					html: emailHtml,
				});
				await this.notificationRepository.save(
					this.notificationRepository.create({
						tenantId: request.tenantId,
						type: NotificationType.MAINTENANCE_UPDATE,
						channel: NotificationChannel.EMAIL,
						subject: emailSubject,
						message: emailHtml,
						sentAt: new Date(),
						status: NotificationStatus.SENT,
					}),
				);
			} catch (err) {
				this.logger.warn(`Failed to send maintenance email to tenant ${request.tenantId}`, err);
				await this.notificationRepository.save(
					this.notificationRepository.create({
						tenantId: request.tenantId,
						type: NotificationType.MAINTENANCE_UPDATE,
						channel: NotificationChannel.EMAIL,
						subject: emailSubject,
						message: emailHtml,
						status: NotificationStatus.FAILED,
						failReason: err instanceof Error ? err.message : 'Unknown error',
					}),
				);
			}
		}
	}
}
