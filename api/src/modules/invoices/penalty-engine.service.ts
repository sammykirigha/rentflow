import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, LessThan, Repository } from 'typeorm';
import { InvoicesRepository } from './invoices.repository';
import { Invoice, InvoiceStatus } from './entities/invoice.entity';
import { Tenant } from '@/modules/tenants/entities/tenant.entity';
import {
	Notification,
	NotificationChannel,
	NotificationStatus,
	NotificationType,
} from '@/modules/notifications/entities/notification.entity';
import { AuditService } from '@/modules/audit/audit.service';
import { AuditAction } from '@/common/enums/audit-action.enum';
import { AuditTargetType } from '@/common/enums/audit-target-type.enum';
import { UserRole } from '@/common/enums/user-role.enum';
import { User } from '@/modules/users/entities/user.entity';
import { Role } from '@/modules/permissions/entities/role.entity';
import { SmsService } from '@/modules/sms/sms.service';
import { MailService } from '@/modules/mail/mail.service';

/**
 * Convert a Date to the Nairobi calendar date (UTC+3).
 * Returns { year, month, day } in EAT.
 */
function toNairobiDate(date: Date): { year: number; month: number; day: number } {
	const utcMs = date.getTime();
	const eatMs = utcMs + 3 * 60 * 60 * 1000; // UTC+3, Kenya has no DST
	const eatDate = new Date(eatMs);
	return {
		year: eatDate.getUTCFullYear(),
		month: eatDate.getUTCMonth() + 1,
		day: eatDate.getUTCDate(),
	};
}

/**
 * Check if two dates fall on the same Nairobi calendar day.
 */
function isSameNairobiDay(d1: Date, d2: Date): boolean {
	const a = toNairobiDate(d1);
	const b = toNairobiDate(d2);
	return a.year === b.year && a.month === b.month && a.day === b.day;
}

/**
 * Format a number as KES currency string.
 */
function formatKES(amount: number): string {
	return `KES ${amount.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

@Injectable()
export class PenaltyEngineService {
	private readonly logger = new Logger(PenaltyEngineService.name);
	private readonly PENALTY_RATE = 0.05; // 5% of rent amount per day

	constructor(
		private readonly dataSource: DataSource,
		private readonly invoicesRepository: InvoicesRepository,
		private readonly auditService: AuditService,
		private readonly smsService: SmsService,
		private readonly mailService: MailService,
		@InjectRepository(Notification)
		private readonly notificationRepository: Repository<Notification>,
		@InjectRepository(Tenant)
		private readonly tenantRepository: Repository<Tenant>,
	) {}

	/**
	 * Cron job: runs daily at 1:00 AM to apply penalties to overdue invoices.
	 * Penalties are applied before reminders (which run at 8 AM) so balances are current.
	 */
	@Cron('0 1 * * *')
	async handleDailyPenalties(): Promise<void> {
		this.logger.log('Cron triggered: daily penalty check');
		await this.applyPenalties();
	}

	/**
	 * Apply daily penalties to all overdue invoices.
	 *
	 * Finds invoices that are UNPAID, PARTIALLY_PAID, or OVERDUE with a dueDate
	 * in the past. Applies 5% of rentAmount as a daily penalty, once per calendar
	 * day (EAT timezone). Sends SMS + email notification after each penalty.
	 */
	async applyPenalties(): Promise<{ penalized: number; totalPenalty: number }> {
		const landlordRole = await this.dataSource.getRepository(Role).findOne({
			where: { name: UserRole.LANDLORD },
		});
		const landlordUser = landlordRole
			? await this.dataSource.getRepository(User).findOne({
					where: { roleId: landlordRole.roleId },
				})
			: null;
		const systemUserId = landlordUser?.userId;

		const now = new Date();

		const overdueInvoices = await this.invoicesRepository.findAll({
			where: {
				status: In([InvoiceStatus.UNPAID, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE]),
				dueDate: LessThan(now),
			},
		});

		this.logger.log(`Found ${overdueInvoices.length} overdue invoice(s) to check for penalty`);

		let penalized = 0;
		let totalPenalty = 0;

		for (const invoice of overdueInvoices) {
			try {
				const penaltyAmount = await this.applyPenaltyToInvoice(invoice, now, systemUserId);
				if (penaltyAmount > 0) {
					penalized++;
					totalPenalty += penaltyAmount;
				}
			} catch (error) {
				this.logger.error(
					`Failed to apply penalty to invoice ${invoice.invoiceNumber}: ${error.message}`,
					error.stack,
				);
			}
		}

		this.logger.log(
			`Penalty run complete: ${penalized} invoice(s) penalized, total penalty ${formatKES(totalPenalty)}`,
		);

		return { penalized, totalPenalty };
	}

	/**
	 * Apply a daily penalty to a single invoice inside a transaction.
	 * Returns the penalty amount applied (0 if skipped due to idempotency).
	 */
	private async applyPenaltyToInvoice(invoice: Invoice, now: Date, systemUserId?: string): Promise<number> {
		const queryRunner = this.dataSource.createQueryRunner();
		await queryRunner.connect();
		await queryRunner.startTransaction();

		try {
			const locked = await queryRunner.manager.findOne(Invoice, {
				where: { invoiceId: invoice.invoiceId },
				lock: { mode: 'pessimistic_write' },
			});

			if (!locked) {
				throw new Error(`Invoice ${invoice.invoiceId} not found during lock`);
			}

			// Skip if already paid/cancelled
			if (
				locked.balanceDue <= 0 ||
				locked.status === InvoiceStatus.PAID ||
				locked.status === InvoiceStatus.CANCELLED
			) {
				await queryRunner.rollbackTransaction();
				return 0;
			}

			// Idempotency: skip if penalty was already applied today (Nairobi time)
			if (locked.penaltyAppliedAt && isSameNairobiDay(locked.penaltyAppliedAt, now)) {
				await queryRunner.rollbackTransaction();
				return 0;
			}

			// Calculate penalty as 5% of rent amount (not balance due)
			const rentAmount = Number(locked.rentAmount);
			const penalty = Math.round(rentAmount * this.PENALTY_RATE * 100) / 100;

			const updatedPenaltyAmount = Number(locked.penaltyAmount) + penalty;
			const updatedTotalAmount = Number(locked.totalAmount) + penalty;
			const updatedBalanceDue = Number(locked.balanceDue) + penalty;

			await queryRunner.manager.update(Invoice, locked.invoiceId, {
				penaltyAmount: updatedPenaltyAmount,
				totalAmount: updatedTotalAmount,
				balanceDue: updatedBalanceDue,
				status: InvoiceStatus.OVERDUE,
				penaltyAppliedAt: now,
			});

			await queryRunner.commitTransaction();

			this.logger.log(
				`Penalty applied to ${locked.invoiceNumber}: ${formatKES(penalty)} ` +
				`(5% of rent ${formatKES(rentAmount)}), balance now ${formatKES(updatedBalanceDue)}`,
			);

			// Audit log (outside the critical transaction)
			if (systemUserId) {
				await this.auditService.createLog({
					action: AuditAction.PENALTY_APPLIED,
					performedBy: systemUserId,
					performerName: 'Penalty Engine',
					targetType: AuditTargetType.INVOICE,
					targetId: locked.invoiceId,
					details: `Daily penalty of ${formatKES(penalty)} applied to invoice ${locked.invoiceNumber}. ` +
						`Outstanding balance: ${formatKES(updatedBalanceDue)}`,
					metadata: {
						invoiceNumber: locked.invoiceNumber,
						tenantId: locked.tenantId,
						penaltyRate: this.PENALTY_RATE,
						penaltyAmount: penalty,
						rentAmount,
						previousBalanceDue: Number(locked.balanceDue),
						newBalanceDue: updatedBalanceDue,
					},
				});
			}

			// Send penalty notification (fire-and-forget)
			this.sendPenaltyNotification(locked, penalty, updatedBalanceDue).catch((err) => {
				this.logger.error(
					`Failed to send penalty notification for ${locked.invoiceNumber}: ${err.message}`,
				);
			});

			return penalty;
		} catch (error) {
			await queryRunner.rollbackTransaction();
			throw error;
		} finally {
			await queryRunner.release();
		}
	}

	/**
	 * Send SMS + email penalty notification to the tenant.
	 */
	private async sendPenaltyNotification(
		invoice: Invoice,
		penaltyAmount: number,
		newBalance: number,
	): Promise<void> {
		const tenant = await this.tenantRepository.findOne({
			where: { tenantId: invoice.tenantId },
			relations: ['user'],
		});

		if (!tenant?.user) {
			this.logger.warn(`No tenant/user found for invoice ${invoice.invoiceNumber}, skipping notification`);
			return;
		}

		const { user } = tenant;
		const now = new Date();

		// SMS
		const smsMessage =
			`RentFlow: A penalty of ${formatKES(penaltyAmount)} has been applied to invoice ${invoice.invoiceNumber}. ` +
			`New balance: ${formatKES(newBalance)}. Pay now to avoid further charges.`;

		try {
			await this.smsService.sendSms(user.phone, smsMessage);

			await this.notificationRepository.save(
				this.notificationRepository.create({
					tenantId: tenant.tenantId,
					invoiceId: invoice.invoiceId,
					type: NotificationType.PENALTY_NOTICE,
					channel: NotificationChannel.SMS,
					message: smsMessage,
					sentAt: now,
					status: NotificationStatus.SENT,
				}),
			);
		} catch (err) {
			this.logger.error(`SMS penalty notice failed for ${user.phone}: ${err.message}`);
			await this.notificationRepository.save(
				this.notificationRepository.create({
					tenantId: tenant.tenantId,
					invoiceId: invoice.invoiceId,
					type: NotificationType.PENALTY_NOTICE,
					channel: NotificationChannel.SMS,
					message: smsMessage,
					status: NotificationStatus.FAILED,
					failReason: err.message,
				}),
			);
		}

		// Email
		const emailSubject = `Penalty Applied - Invoice ${invoice.invoiceNumber}`;
		const emailHtml = `
			<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
				<h2 style="color: #dc2626;">Penalty Notice</h2>
				<p>Dear ${user.firstName || 'Tenant'},</p>
				<p>A daily penalty has been applied to your overdue invoice.</p>
				<table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
					<tr style="border-bottom: 1px solid #e5e7eb;">
						<td style="padding: 8px; font-weight: bold;">Invoice</td>
						<td style="padding: 8px; text-align: right;">${invoice.invoiceNumber}</td>
					</tr>
					<tr style="border-bottom: 1px solid #e5e7eb;">
						<td style="padding: 8px; font-weight: bold;">Penalty Applied</td>
						<td style="padding: 8px; text-align: right; color: #dc2626;">${formatKES(penaltyAmount)}</td>
					</tr>
					<tr style="border-bottom: 1px solid #e5e7eb;">
						<td style="padding: 8px; font-weight: bold;">Total Penalties to Date</td>
						<td style="padding: 8px; text-align: right; color: #dc2626;">${formatKES(Number(invoice.penaltyAmount) + penaltyAmount)}</td>
					</tr>
					<tr style="background-color: #fef2f2;">
						<td style="padding: 8px; font-weight: bold;">Outstanding Balance</td>
						<td style="padding: 8px; text-align: right; font-weight: bold; color: #dc2626;">${formatKES(newBalance)}</td>
					</tr>
				</table>
				<p style="color: #dc2626; font-weight: bold;">A penalty of 5% of your rent amount is applied daily for overdue invoices. Pay now to stop further charges.</p>
				<p>Thank you,<br/>RentFlow</p>
			</div>
		`;

		try {
			await this.mailService.sendEmail({
				to: user.email,
				subject: emailSubject,
				html: emailHtml,
			});

			await this.notificationRepository.save(
				this.notificationRepository.create({
					tenantId: tenant.tenantId,
					invoiceId: invoice.invoiceId,
					type: NotificationType.PENALTY_NOTICE,
					channel: NotificationChannel.EMAIL,
					subject: emailSubject,
					message: emailHtml,
					sentAt: now,
					status: NotificationStatus.SENT,
				}),
			);
		} catch (err) {
			this.logger.error(`Email penalty notice failed for ${user.email}: ${err.message}`);
			await this.notificationRepository.save(
				this.notificationRepository.create({
					tenantId: tenant.tenantId,
					invoiceId: invoice.invoiceId,
					type: NotificationType.PENALTY_NOTICE,
					channel: NotificationChannel.EMAIL,
					subject: emailSubject,
					message: emailHtml,
					status: NotificationStatus.FAILED,
					failReason: err.message,
				}),
			);
		}
	}
}
