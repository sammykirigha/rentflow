import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, MoreThan, Repository, Between } from 'typeorm';
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
 * Kenya has no DST so a fixed +3h offset is correct.
 */
function toNairobiDate(date: Date): { year: number; month: number; day: number } {
	const eatMs = date.getTime() + 3 * 60 * 60 * 1000;
	const eatDate = new Date(eatMs);
	return {
		year: eatDate.getUTCFullYear(),
		month: eatDate.getUTCMonth() + 1,
		day: eatDate.getUTCDate(),
	};
}

/**
 * Get UTC start and end of the current Nairobi day.
 * Nairobi is UTC+3, so the day starts at 21:00 UTC (previous day) and ends at 21:00 UTC.
 */
function getNairobiDayBoundsUTC(date: Date): { start: Date; end: Date } {
	const nairobi = toNairobiDate(date);
	// Start of Nairobi day in UTC = midnight EAT = 21:00 UTC previous day
	const startUTC = new Date(Date.UTC(nairobi.year, nairobi.month - 1, nairobi.day, 0, 0, 0, 0));
	startUTC.setTime(startUTC.getTime() - 3 * 60 * 60 * 1000); // subtract 3h for UTC
	const endUTC = new Date(startUTC.getTime() + 24 * 60 * 60 * 1000);
	return { start: startUTC, end: endUTC };
}

/**
 * Format a number as KES currency string.
 */
function formatKES(amount: number): string {
	return `KES ${amount.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Format a Date as a readable date string in Nairobi timezone.
 */
function formatNairobiDate(date: Date): string {
	const nairobi = toNairobiDate(date);
	const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	return `${nairobi.day} ${months[nairobi.month - 1]} ${nairobi.year}`;
}

@Injectable()
export class ReminderService {
	private readonly logger = new Logger(ReminderService.name);

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
	 * Cron job: runs daily at 8:00 AM to send reminders for unsettled invoices.
	 * Runs after penalties (1 AM) so balances reflect today's penalty if any.
	 */
	@Cron('0 8 * * *')
	async handleDailyReminders(): Promise<void> {
		this.logger.log('Cron triggered: daily invoice reminders');
		await this.sendReminders();
	}

	/**
	 * Send reminders for all unsettled invoices.
	 *
	 * Day 1: No reminders (invoice generation day)
	 * Days 2-5: Grace period - friendly payment reminders
	 * Day 6+: Overdue notices with penalty info
	 */
	async sendReminders(): Promise<{ sent: number; skipped: number }> {
		const now = new Date();
		const nairobi = toNairobiDate(now);
		const dayOfMonth = nairobi.day;

		// Day 1 is invoice generation day — no reminders
		if (dayOfMonth < 2) {
			this.logger.log('Day 1 of month — skipping reminders (invoice generation day)');
			return { sent: 0, skipped: 0 };
		}

		const landlordRole = await this.dataSource.getRepository(Role).findOne({
			where: { name: UserRole.LANDLORD },
		});
		const landlordUser = landlordRole
			? await this.dataSource.getRepository(User).findOne({
					where: { roleId: landlordRole.roleId },
				})
			: null;
		const systemUserId = landlordUser?.userId;

		// Find all unsettled invoices with a positive balance
		const unsettledInvoices = await this.invoicesRepository.findAll({
			where: {
				status: In([InvoiceStatus.UNPAID, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE]),
				balanceDue: MoreThan(0),
			},
			relations: ['tenant', 'tenant.user'],
		});

		this.logger.log(`Found ${unsettledInvoices.length} unsettled invoice(s) to check for reminders`);

		let sent = 0;
		let skipped = 0;

		for (const invoice of unsettledInvoices) {
			try {
				const alreadySent = await this.hasReminderBeenSentToday(invoice.invoiceId, now);
				if (alreadySent) {
					skipped++;
					continue;
				}

				const isOverdue = dayOfMonth >= 6;
				await this.sendReminderForInvoice(invoice, isOverdue, systemUserId);
				sent++;
			} catch (error) {
				this.logger.error(
					`Failed to send reminder for invoice ${invoice.invoiceNumber}: ${error.message}`,
					error.stack,
				);
			}
		}

		this.logger.log(`Reminder run complete: ${sent} sent, ${skipped} skipped (already sent today)`);
		return { sent, skipped };
	}

	/**
	 * Check if a PAYMENT_REMINDER notification was already sent today (Nairobi time)
	 * for the given invoice.
	 */
	private async hasReminderBeenSentToday(invoiceId: string, now: Date): Promise<boolean> {
		const { start, end } = getNairobiDayBoundsUTC(now);

		const count = await this.notificationRepository.count({
			where: {
				invoiceId,
				type: NotificationType.PAYMENT_REMINDER,
				sentAt: Between(start, end),
			},
		});

		return count > 0;
	}

	/**
	 * Send SMS + email reminder for a single invoice.
	 */
	private async sendReminderForInvoice(
		invoice: Invoice,
		isOverdue: boolean,
		systemUserId?: string,
	): Promise<void> {
		// Load tenant with user if not already loaded
		let tenant = invoice.tenant;
		if (!tenant?.user) {
			tenant = await this.tenantRepository.findOne({
				where: { tenantId: invoice.tenantId },
				relations: ['user'],
			});
		}

		if (!tenant?.user) {
			this.logger.warn(`No tenant/user found for invoice ${invoice.invoiceNumber}, skipping reminder`);
			return;
		}

		const { user } = tenant;
		const now = new Date();
		const balanceDue = Number(invoice.balanceDue);
		const dueDateStr = formatNairobiDate(invoice.dueDate);

		// Determine the 6th of the current month for the penalty start warning
		const nairobi = toNairobiDate(now);
		const penaltyStartDate = `6 ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][nairobi.month - 1]} ${nairobi.year}`;

		if (isOverdue) {
			await this.sendOverdueReminder(invoice, tenant, user, balanceDue, now, systemUserId);
		} else {
			await this.sendGracePeriodReminder(invoice, tenant, user, balanceDue, dueDateStr, penaltyStartDate, now, systemUserId);
		}
	}

	/**
	 * Grace period reminder (days 2-5): friendly message with penalty warning.
	 */
	private async sendGracePeriodReminder(
		invoice: Invoice,
		tenant: Tenant,
		user: User,
		balanceDue: number,
		dueDateStr: string,
		penaltyStartDate: string,
		now: Date,
		systemUserId?: string,
	): Promise<void> {
		// SMS
		const smsMessage =
			`RentFlow: Reminder - Invoice ${invoice.invoiceNumber} for ${this.getBillingMonthLabel(invoice.billingMonth)}. ` +
			`Balance: ${formatKES(balanceDue)}. Due by ${dueDateStr}. ` +
			`Pay via Paybill to avoid daily penalties starting ${penaltyStartDate}.`;

		await this.sendSmsNotification(tenant, invoice, smsMessage, now);

		// Email
		const emailSubject = `Payment Reminder - Invoice ${invoice.invoiceNumber}`;
		const emailHtml = `
			<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
				<h2 style="color: #2563eb;">Payment Reminder</h2>
				<p>Dear ${user.firstName || 'Tenant'},</p>
				<p>This is a friendly reminder that your invoice is pending payment.</p>
				<table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
					<tr style="border-bottom: 1px solid #e5e7eb;">
						<td style="padding: 8px; font-weight: bold;">Invoice</td>
						<td style="padding: 8px; text-align: right;">${invoice.invoiceNumber}</td>
					</tr>
					<tr style="border-bottom: 1px solid #e5e7eb;">
						<td style="padding: 8px; font-weight: bold;">Billing Month</td>
						<td style="padding: 8px; text-align: right;">${this.getBillingMonthLabel(invoice.billingMonth)}</td>
					</tr>
					<tr style="border-bottom: 1px solid #e5e7eb;">
						<td style="padding: 8px; font-weight: bold;">Total Amount</td>
						<td style="padding: 8px; text-align: right;">${formatKES(Number(invoice.totalAmount))}</td>
					</tr>
					<tr style="border-bottom: 1px solid #e5e7eb;">
						<td style="padding: 8px; font-weight: bold;">Amount Paid</td>
						<td style="padding: 8px; text-align: right;">${formatKES(Number(invoice.amountPaid))}</td>
					</tr>
					<tr style="background-color: #eff6ff;">
						<td style="padding: 8px; font-weight: bold;">Balance Due</td>
						<td style="padding: 8px; text-align: right; font-weight: bold;">${formatKES(balanceDue)}</td>
					</tr>
				</table>
				<p><strong>Due Date:</strong> ${dueDateStr}</p>
				<p style="color: #d97706; font-weight: bold;">Please note: A daily penalty of 5% of your rent amount will be applied starting ${penaltyStartDate} for unpaid invoices.</p>
				<p>Thank you,<br/>RentFlow</p>
			</div>
		`;

		await this.sendEmailNotification(tenant, invoice, emailSubject, emailHtml, now);

		// Audit log
		if (systemUserId) {
			await this.auditService.createLog({
				action: AuditAction.REMINDER_SENT,
				performedBy: systemUserId,
				performerName: 'Reminder Service',
				targetType: AuditTargetType.INVOICE,
				targetId: invoice.invoiceId,
				details: `Grace period reminder sent for invoice ${invoice.invoiceNumber}. Balance: ${formatKES(balanceDue)}`,
				metadata: {
					invoiceNumber: invoice.invoiceNumber,
					tenantId: tenant.tenantId,
					balanceDue,
					period: 'grace',
				},
			});
		}
	}

	/**
	 * Overdue reminder (day 6+): urgent message with penalty breakdown.
	 */
	private async sendOverdueReminder(
		invoice: Invoice,
		tenant: Tenant,
		user: User,
		balanceDue: number,
		now: Date,
		systemUserId?: string,
	): Promise<void> {
		const penaltyAmount = Number(invoice.penaltyAmount);

		// SMS
		const smsMessage =
			`RentFlow: OVERDUE - Invoice ${invoice.invoiceNumber}. ` +
			`Balance: ${formatKES(balanceDue)} (incl. penalties). ` +
			`A daily penalty of 5% of rent is being applied. Pay now.`;

		await this.sendSmsNotification(tenant, invoice, smsMessage, now);

		// Email
		const originalAmount = Number(invoice.subtotal);
		const emailSubject = `OVERDUE - Invoice ${invoice.invoiceNumber}`;
		const emailHtml = `
			<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
				<h2 style="color: #dc2626;">Overdue Invoice Notice</h2>
				<p>Dear ${user.firstName || 'Tenant'},</p>
				<p>Your invoice is <strong>overdue</strong> and daily penalties are being applied.</p>
				<table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
					<tr style="border-bottom: 1px solid #e5e7eb;">
						<td style="padding: 8px; font-weight: bold;">Invoice</td>
						<td style="padding: 8px; text-align: right;">${invoice.invoiceNumber}</td>
					</tr>
					<tr style="border-bottom: 1px solid #e5e7eb;">
						<td style="padding: 8px; font-weight: bold;">Original Amount</td>
						<td style="padding: 8px; text-align: right;">${formatKES(originalAmount)}</td>
					</tr>
					<tr style="border-bottom: 1px solid #e5e7eb;">
						<td style="padding: 8px; font-weight: bold;">Total Penalties</td>
						<td style="padding: 8px; text-align: right; color: #dc2626;">${formatKES(penaltyAmount)}</td>
					</tr>
					<tr style="border-bottom: 1px solid #e5e7eb;">
						<td style="padding: 8px; font-weight: bold;">Amount Paid</td>
						<td style="padding: 8px; text-align: right;">${formatKES(Number(invoice.amountPaid))}</td>
					</tr>
					<tr style="background-color: #fef2f2;">
						<td style="padding: 8px; font-weight: bold;">Outstanding Balance</td>
						<td style="padding: 8px; text-align: right; font-weight: bold; color: #dc2626;">${formatKES(balanceDue)}</td>
					</tr>
				</table>
				<p style="color: #dc2626; font-weight: bold;">A penalty of 5% of your rent amount (${formatKES(Number(invoice.rentAmount) * 0.05)}) is applied every day your invoice remains unpaid. Pay immediately to stop further charges.</p>
				<p>Thank you,<br/>RentFlow</p>
			</div>
		`;

		await this.sendEmailNotification(tenant, invoice, emailSubject, emailHtml, now);

		// Audit log
		if (systemUserId) {
			await this.auditService.createLog({
				action: AuditAction.REMINDER_SENT,
				performedBy: systemUserId,
				performerName: 'Reminder Service',
				targetType: AuditTargetType.INVOICE,
				targetId: invoice.invoiceId,
				details: `Overdue reminder sent for invoice ${invoice.invoiceNumber}. Balance: ${formatKES(balanceDue)} (incl. penalties: ${formatKES(penaltyAmount)})`,
				metadata: {
					invoiceNumber: invoice.invoiceNumber,
					tenantId: tenant.tenantId,
					balanceDue,
					penaltyAmount,
					period: 'overdue',
				},
			});
		}
	}

	/**
	 * Send SMS and create notification record.
	 */
	private async sendSmsNotification(
		tenant: Tenant,
		invoice: Invoice,
		message: string,
		now: Date,
	): Promise<void> {
		const phone = tenant.user?.phone;
		if (!phone) {
			this.logger.warn(`No phone number for tenant ${tenant.tenantId}, skipping SMS reminder`);
			return;
		}

		try {
			await this.smsService.sendSms(phone, message);

			await this.notificationRepository.save(
				this.notificationRepository.create({
					tenantId: tenant.tenantId,
					invoiceId: invoice.invoiceId,
					type: NotificationType.PAYMENT_REMINDER,
					channel: NotificationChannel.SMS,
					message,
					sentAt: now,
					status: NotificationStatus.SENT,
				}),
			);
		} catch (err) {
			this.logger.error(`SMS reminder failed for ${phone}: ${err.message}`);
			await this.notificationRepository.save(
				this.notificationRepository.create({
					tenantId: tenant.tenantId,
					invoiceId: invoice.invoiceId,
					type: NotificationType.PAYMENT_REMINDER,
					channel: NotificationChannel.SMS,
					message,
					status: NotificationStatus.FAILED,
					failReason: err.message,
				}),
			);
		}
	}

	/**
	 * Send email and create notification record.
	 */
	private async sendEmailNotification(
		tenant: Tenant,
		invoice: Invoice,
		subject: string,
		html: string,
		now: Date,
	): Promise<void> {
		const email = tenant.user?.email;
		if (!email) {
			this.logger.warn(`No email for tenant ${tenant.tenantId}, skipping email reminder`);
			return;
		}

		try {
			await this.mailService.sendEmail({ to: email, subject, html });

			await this.notificationRepository.save(
				this.notificationRepository.create({
					tenantId: tenant.tenantId,
					invoiceId: invoice.invoiceId,
					type: NotificationType.PAYMENT_REMINDER,
					channel: NotificationChannel.EMAIL,
					subject,
					message: html,
					sentAt: now,
					status: NotificationStatus.SENT,
				}),
			);
		} catch (err) {
			this.logger.error(`Email reminder failed for ${email}: ${err.message}`);
			await this.notificationRepository.save(
				this.notificationRepository.create({
					tenantId: tenant.tenantId,
					invoiceId: invoice.invoiceId,
					type: NotificationType.PAYMENT_REMINDER,
					channel: NotificationChannel.EMAIL,
					subject,
					message: html,
					status: NotificationStatus.FAILED,
					failReason: err.message,
				}),
			);
		}
	}

	/**
	 * Get a human-readable label for the billing month.
	 */
	private getBillingMonthLabel(billingMonth: Date): string {
		const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
		const d = new Date(billingMonth);
		return `${months[d.getMonth()]} ${d.getFullYear()}`;
	}
}
