import { orgAsyncStorage } from '@/common/services/org-async-context';
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

type ReminderType = 'friendly' | 'due_today' | 'overdue' | 'landlord_escalation';

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
	 * Determine the reminder type based on day of month.
	 *
	 * Smart Reminder Sequence:
	 * - Day 1: No reminders (invoice generation day)
	 * - Day 3: Friendly reminder
	 * - Day 5: Due-date warning
	 * - Day 7+: Overdue notice (penalties being applied)
	 * - Day 10: Landlord escalation (notify landlord, not tenant)
	 */
	private getReminderType(dayOfMonth: number): ReminderType | null {
		if (dayOfMonth < 2) return null; // Day 1 = invoice generation
		if (dayOfMonth <= 4) return 'friendly';
		if (dayOfMonth <= 6) return 'due_today';
		if (dayOfMonth === 10) return 'landlord_escalation';
		if (dayOfMonth >= 7) return 'overdue';
		return null;
	}

	/**
	 * Map reminder type to notification type for idempotency checking.
	 */
	private getNotificationType(type: ReminderType): NotificationType {
		switch (type) {
			case 'friendly': return NotificationType.FRIENDLY_REMINDER;
			case 'due_today': return NotificationType.DUE_TODAY_WARNING;
			case 'overdue': return NotificationType.PAYMENT_REMINDER;
			case 'landlord_escalation': return NotificationType.LANDLORD_ESCALATION;
		}
	}

	/**
	 * Send reminders for all unsettled invoices using the escalating sequence.
	 */
	async sendReminders(): Promise<{ sent: number; skipped: number }> {
		const now = new Date();
		const nairobi = toNairobiDate(now);
		const dayOfMonth = nairobi.day;

		const reminderType = this.getReminderType(dayOfMonth);
		if (!reminderType) {
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

		// Day 10 landlord escalation: aggregate all unpaid invoices and notify landlord
		if (reminderType === 'landlord_escalation') {
			await this.sendLandlordEscalation(systemUserId, now);
			return { sent: 1, skipped: 0 };
		}

		// Find all unsettled invoices with a positive balance
		const unsettledInvoices = await this.invoicesRepository.findAll({
			where: {
				status: In([InvoiceStatus.UNPAID, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE]),
				balanceDue: MoreThan(0),
			},
			relations: ['tenant', 'tenant.user'],
		});

		this.logger.log(`Found ${unsettledInvoices.length} unsettled invoice(s) for ${reminderType} reminders`);

		let sent = 0;
		let skipped = 0;

		const notificationType = this.getNotificationType(reminderType);

		for (const invoice of unsettledInvoices) {
			await orgAsyncStorage.run(
				{ organizationId: invoice.organizationId, isSuperAdmin: false, impersonatedBy: null },
				async () => {
					try {
						const alreadySent = await this.hasReminderBeenSentToday(invoice.invoiceId, notificationType, now);
						if (alreadySent) {
							skipped++;
							return;
						}

						switch (reminderType) {
							case 'friendly':
								await this.sendFriendlyReminder(invoice, now, systemUserId);
								break;
							case 'due_today':
								await this.sendDueTodayWarning(invoice, now, systemUserId);
								break;
							case 'overdue':
								await this.sendOverdueReminder(invoice, now, systemUserId);
								break;
						}
						sent++;
					} catch (error) {
						this.logger.error(
							`Failed to send ${reminderType} reminder for invoice ${invoice.invoiceNumber}: ${error.message}`,
							error.stack,
						);
					}
				},
			);
		}

		this.logger.log(`Reminder run complete (${reminderType}): ${sent} sent, ${skipped} skipped`);
		return { sent, skipped };
	}

	/**
	 * Check if a specific notification type was already sent today (Nairobi time)
	 * for the given invoice.
	 */
	private async hasReminderBeenSentToday(invoiceId: string, type: NotificationType, now: Date): Promise<boolean> {
		const { start, end } = getNairobiDayBoundsUTC(now);

		const count = await this.notificationRepository.count({
			where: {
				invoiceId,
				type,
				status: NotificationStatus.SENT,
				sentAt: Between(start, end),
			},
		});

		return count > 0;
	}

	/**
	 * Day 3: Friendly reminder — gentle nudge.
	 */
	private async sendFriendlyReminder(
		invoice: Invoice,
		now: Date,
		systemUserId?: string,
	): Promise<void> {
		const tenant = await this.loadTenant(invoice);
		if (!tenant?.user) return;

		const { user } = tenant;
		const balanceDue = Number(invoice.balanceDue);
		const dueDateStr = formatNairobiDate(invoice.dueDate);

		// SMS
		const smsMessage =
			`Hi ${user.firstName || 'there'}, just a gentle reminder that your rent invoice ` +
			`${invoice.invoiceNumber} of ${formatKES(balanceDue)} is due by ${dueDateStr}. ` +
			`Please pay at your earliest convenience. Thank you! — RentFlow`;

		await this.sendSmsNotification(tenant, invoice, smsMessage, now, NotificationType.FRIENDLY_REMINDER);

		// Email
		const emailHtml = `
			<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
				<h2 style="color: #1890ff;">Friendly Payment Reminder</h2>
				<p>Hi ${user.firstName || 'there'},</p>
				<p>Just a gentle reminder about your upcoming rent payment.</p>
				<table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
					<tr style="border-bottom: 1px solid #e5e7eb;">
						<td style="padding: 8px; font-weight: bold;">Invoice</td>
						<td style="padding: 8px; text-align: right;">${invoice.invoiceNumber}</td>
					</tr>
					<tr style="border-bottom: 1px solid #e5e7eb;">
						<td style="padding: 8px; font-weight: bold;">Billing Month</td>
						<td style="padding: 8px; text-align: right;">${this.getBillingMonthLabel(invoice.billingMonth)}</td>
					</tr>
					<tr style="background-color: #eff6ff;">
						<td style="padding: 8px; font-weight: bold;">Balance Due</td>
						<td style="padding: 8px; text-align: right; font-weight: bold;">${formatKES(balanceDue)}</td>
					</tr>
				</table>
				<p><strong>Due Date:</strong> ${dueDateStr}</p>
				<p>Thank you for being a great tenant!</p>
				<p>Warm regards,<br/>RentFlow</p>
			</div>
		`;

		await this.sendEmailNotification(tenant, invoice, `Friendly Reminder - Invoice ${invoice.invoiceNumber}`, emailHtml, now, NotificationType.FRIENDLY_REMINDER);

		if (systemUserId) {
			await this.auditService.createLog({
				action: AuditAction.REMINDER_SENT,
				performedBy: systemUserId,
				performerName: 'Reminder Service',
				targetType: AuditTargetType.INVOICE,
				targetId: invoice.invoiceId,
				details: `Friendly reminder sent for invoice ${invoice.invoiceNumber}. Balance: ${formatKES(balanceDue)}`,
				metadata: { invoiceNumber: invoice.invoiceNumber, tenantId: tenant.tenantId, balanceDue, period: 'friendly' },
			});
		}
	}

	/**
	 * Day 5: Due-today warning — urgent tone with penalty warning.
	 */
	private async sendDueTodayWarning(
		invoice: Invoice,
		now: Date,
		systemUserId?: string,
	): Promise<void> {
		const tenant = await this.loadTenant(invoice);
		if (!tenant?.user) return;

		const { user } = tenant;
		const balanceDue = Number(invoice.balanceDue);
		const nairobi = toNairobiDate(now);
		const penaltyStartDate = `6 ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][nairobi.month - 1]} ${nairobi.year}`;

		// SMS
		const smsMessage =
			`RentFlow: Your rent of ${formatKES(balanceDue)} is DUE TODAY. ` +
			`Invoice ${invoice.invoiceNumber}. ` +
			`A daily penalty of 5% will be applied starting tomorrow (${penaltyStartDate}). Pay now to avoid extra charges.`;

		await this.sendSmsNotification(tenant, invoice, smsMessage, now, NotificationType.DUE_TODAY_WARNING);

		// Email
		const emailHtml = `
			<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
				<h2 style="color: #d97706;">Payment Due Today</h2>
				<p>Dear ${user.firstName || 'Tenant'},</p>
				<p>Your rent payment is <strong>due today</strong>. Please make your payment to avoid penalties.</p>
				<table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
					<tr style="border-bottom: 1px solid #e5e7eb;">
						<td style="padding: 8px; font-weight: bold;">Invoice</td>
						<td style="padding: 8px; text-align: right;">${invoice.invoiceNumber}</td>
					</tr>
					<tr style="border-bottom: 1px solid #e5e7eb;">
						<td style="padding: 8px; font-weight: bold;">Total Amount</td>
						<td style="padding: 8px; text-align: right;">${formatKES(Number(invoice.totalAmount))}</td>
					</tr>
					<tr style="border-bottom: 1px solid #e5e7eb;">
						<td style="padding: 8px; font-weight: bold;">Amount Paid</td>
						<td style="padding: 8px; text-align: right;">${formatKES(Number(invoice.amountPaid))}</td>
					</tr>
					<tr style="background-color: #fef3c7;">
						<td style="padding: 8px; font-weight: bold;">Balance Due</td>
						<td style="padding: 8px; text-align: right; font-weight: bold; color: #d97706;">${formatKES(balanceDue)}</td>
					</tr>
				</table>
				<p style="color: #d97706; font-weight: bold;">A daily penalty of 5% of your rent amount will be applied starting ${penaltyStartDate} if payment is not received.</p>
				<p>Thank you,<br/>RentFlow</p>
			</div>
		`;

		await this.sendEmailNotification(tenant, invoice, `URGENT: Payment Due Today - Invoice ${invoice.invoiceNumber}`, emailHtml, now, NotificationType.DUE_TODAY_WARNING);

		if (systemUserId) {
			await this.auditService.createLog({
				action: AuditAction.REMINDER_SENT,
				performedBy: systemUserId,
				performerName: 'Reminder Service',
				targetType: AuditTargetType.INVOICE,
				targetId: invoice.invoiceId,
				details: `Due-today warning sent for invoice ${invoice.invoiceNumber}. Balance: ${formatKES(balanceDue)}`,
				metadata: { invoiceNumber: invoice.invoiceNumber, tenantId: tenant.tenantId, balanceDue, period: 'due_today' },
			});
		}
	}

	/**
	 * Day 7+: Overdue reminder — urgent message with penalty breakdown.
	 */
	private async sendOverdueReminder(
		invoice: Invoice,
		now: Date,
		systemUserId?: string,
	): Promise<void> {
		const tenant = await this.loadTenant(invoice);
		if (!tenant?.user) return;

		const { user } = tenant;
		const balanceDue = Number(invoice.balanceDue);
		const penaltyAmount = Number(invoice.penaltyAmount);

		// SMS
		const smsMessage =
			`RentFlow: OVERDUE - Invoice ${invoice.invoiceNumber}. ` +
			`Balance: ${formatKES(balanceDue)} (incl. penalties). ` +
			`A daily penalty of 5% of rent is being applied. Pay now.`;

		await this.sendSmsNotification(tenant, invoice, smsMessage, now, NotificationType.PAYMENT_REMINDER);

		// Email
		const originalAmount = Number(invoice.subtotal);
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

		await this.sendEmailNotification(tenant, invoice, `OVERDUE - Invoice ${invoice.invoiceNumber}`, emailHtml, now, NotificationType.PAYMENT_REMINDER);

		if (systemUserId) {
			await this.auditService.createLog({
				action: AuditAction.REMINDER_SENT,
				performedBy: systemUserId,
				performerName: 'Reminder Service',
				targetType: AuditTargetType.INVOICE,
				targetId: invoice.invoiceId,
				details: `Overdue reminder sent for invoice ${invoice.invoiceNumber}. Balance: ${formatKES(balanceDue)} (incl. penalties: ${formatKES(penaltyAmount)})`,
				metadata: { invoiceNumber: invoice.invoiceNumber, tenantId: tenant.tenantId, balanceDue, penaltyAmount, period: 'overdue' },
			});
		}
	}

	/**
	 * Day 10: Landlord escalation — notify landlord of all unpaid tenants.
	 */
	private async sendLandlordEscalation(
		systemUserId?: string,
		now?: Date,
	): Promise<void> {
		now = now || new Date();

		// Find the org owner / landlord
		const ownerRole = await this.dataSource.getRepository(Role).findOne({
			where: { name: In([UserRole.LANDLORD, UserRole.ORG_OWNER] as UserRole[]) },
		});
		const ownerUser = ownerRole
			? await this.dataSource.getRepository(User).findOne({
					where: { roleId: ownerRole.roleId },
				})
			: null;

		if (!ownerUser) {
			this.logger.warn('No landlord/owner found for escalation notification');
			return;
		}

		// Get all unsettled invoices with tenant details
		const unsettledInvoices = await this.invoicesRepository.findAll({
			where: {
				status: In([InvoiceStatus.UNPAID, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE]),
				balanceDue: MoreThan(0),
			},
			relations: ['tenant', 'tenant.user', 'tenant.unit'],
		});

		if (unsettledInvoices.length === 0) {
			this.logger.log('No unpaid invoices for landlord escalation');
			return;
		}

		const totalOutstanding = unsettledInvoices.reduce((sum, inv) => sum + Number(inv.balanceDue), 0);

		// SMS to landlord
		const smsMessage =
			`RentFlow ESCALATION: ${unsettledInvoices.length} invoice(s) still unpaid. ` +
			`Total outstanding: ${formatKES(totalOutstanding)}. ` +
			`Please log in to review and take action.`;

		if (ownerUser.phone) {
			try {
				await this.smsService.sendSms(ownerUser.phone, smsMessage);
			} catch (err) {
				this.logger.error(`Failed to send escalation SMS to landlord: ${err.message}`);
			}
		}

		// Email to landlord with details table
		const tenantRows = unsettledInvoices
			.map((inv) => {
				const name = inv.tenant?.user
					? `${inv.tenant.user.firstName || ''} ${inv.tenant.user.lastName || ''}`.trim()
					: 'Unknown';
				const unit = inv.tenant?.unit?.unitNumber || '-';
				return `
					<tr style="border-bottom: 1px solid #e5e7eb;">
						<td style="padding: 6px 8px;">${name}</td>
						<td style="padding: 6px 8px;">${unit}</td>
						<td style="padding: 6px 8px;">${inv.invoiceNumber}</td>
						<td style="padding: 6px 8px; text-align: right;">${formatKES(Number(inv.balanceDue))}</td>
						<td style="padding: 6px 8px;">${inv.status.toUpperCase()}</td>
					</tr>
				`;
			})
			.join('');

		const emailHtml = `
			<div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
				<h2 style="color: #dc2626;">Unpaid Invoices Escalation Report</h2>
				<p>Dear ${ownerUser.firstName || 'Landlord'},</p>
				<p>The following ${unsettledInvoices.length} invoice(s) remain unpaid as of Day 10. Total outstanding: <strong>${formatKES(totalOutstanding)}</strong>.</p>
				<table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
					<thead>
						<tr style="background: #f9fafb; border-bottom: 2px solid #e5e7eb;">
							<th style="padding: 8px; text-align: left;">Tenant</th>
							<th style="padding: 8px; text-align: left;">Unit</th>
							<th style="padding: 8px; text-align: left;">Invoice</th>
							<th style="padding: 8px; text-align: right;">Balance Due</th>
							<th style="padding: 8px; text-align: left;">Status</th>
						</tr>
					</thead>
					<tbody>${tenantRows}</tbody>
				</table>
				<p>Please log in to RentFlow to review and take appropriate action.</p>
				<p>Regards,<br/>RentFlow System</p>
			</div>
		`;

		if (ownerUser.email) {
			try {
				await this.mailService.sendEmail({
					to: ownerUser.email,
					subject: `ESCALATION: ${unsettledInvoices.length} Unpaid Invoices — ${formatKES(totalOutstanding)} Outstanding`,
					html: emailHtml,
				});
			} catch (err) {
				this.logger.error(`Failed to send escalation email to landlord: ${err.message}`);
			}
		}

		// Audit log
		if (systemUserId) {
			await this.auditService.createLog({
				action: AuditAction.LANDLORD_ESCALATION,
				performedBy: systemUserId,
				performerName: 'Reminder Service',
				targetType: AuditTargetType.NOTIFICATION,
				details: `Landlord escalation: ${unsettledInvoices.length} unpaid invoices totaling ${formatKES(totalOutstanding)}`,
				metadata: {
					invoiceCount: unsettledInvoices.length,
					totalOutstanding,
					landlordEmail: ownerUser.email,
				},
			});
		}

		this.logger.log(`Landlord escalation sent: ${unsettledInvoices.length} invoices, ${formatKES(totalOutstanding)} outstanding`);
	}

	/**
	 * Load tenant with user relation if not already loaded.
	 */
	private async loadTenant(invoice: Invoice): Promise<Tenant | null> {
		if (!invoice.tenantId) {
			this.logger.log(`Skipping reminder for non-tenant invoice ${invoice.invoiceNumber}`);
			return null;
		}

		let tenant = invoice.tenant;
		if (!tenant?.user) {
			tenant = await this.tenantRepository.findOne({
				where: { tenantId: invoice.tenantId },
				relations: ['user'],
			});
		}

		if (!tenant?.user) {
			this.logger.warn(`No tenant/user found for invoice ${invoice.invoiceNumber}, skipping reminder`);
			return null;
		}

		return tenant;
	}

	/**
	 * Send SMS and create notification record.
	 */
	private async sendSmsNotification(
		tenant: Tenant,
		invoice: Invoice,
		message: string,
		now: Date,
		type: NotificationType = NotificationType.PAYMENT_REMINDER,
	): Promise<void> {
		const phone = tenant.user?.phone;
		if (!phone) {
			this.logger.warn(`No phone number for tenant ${tenant.tenantId}, skipping SMS reminder`);
			return;
		}

		try {
			const result = await this.smsService.sendSms(phone, message);

			if (result.success) {
				await this.notificationRepository.save(
					this.notificationRepository.create({
						tenantId: tenant.tenantId,
						invoiceId: invoice.invoiceId,
						type,
						channel: NotificationChannel.SMS,
						message,
						sentAt: now,
						status: NotificationStatus.SENT,
					}),
				);
			} else {
				this.logger.warn(`SMS reminder not delivered for ${phone} (invoice ${invoice.invoiceNumber})`);
				await this.notificationRepository.save(
					this.notificationRepository.create({
						tenantId: tenant.tenantId,
						invoiceId: invoice.invoiceId,
						type,
						channel: NotificationChannel.SMS,
						message,
						status: NotificationStatus.FAILED,
						failReason: 'SMS delivery failed',
					}),
				);
			}
		} catch (err) {
			this.logger.error(`SMS reminder failed for ${phone}: ${err.message}`);
			await this.notificationRepository.save(
				this.notificationRepository.create({
					tenantId: tenant.tenantId,
					invoiceId: invoice.invoiceId,
					type,
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
		type: NotificationType = NotificationType.PAYMENT_REMINDER,
	): Promise<void> {
		const email = tenant.user?.email;
		if (!email) {
			this.logger.warn(`No email for tenant ${tenant.tenantId}, skipping email reminder`);
			return;
		}

		try {
			const result = await this.mailService.sendEmail({ to: email, subject, html });

			if (result) {
				await this.notificationRepository.save(
					this.notificationRepository.create({
						tenantId: tenant.tenantId,
						invoiceId: invoice.invoiceId,
						type,
						channel: NotificationChannel.EMAIL,
						subject,
						message: html,
						sentAt: now,
						status: NotificationStatus.SENT,
					}),
				);
			} else {
				this.logger.warn(`Email reminder not delivered for ${email} (invoice ${invoice.invoiceNumber})`);
				await this.notificationRepository.save(
					this.notificationRepository.create({
						tenantId: tenant.tenantId,
						invoiceId: invoice.invoiceId,
						type,
						channel: NotificationChannel.EMAIL,
						subject,
						message: html,
						status: NotificationStatus.FAILED,
						failReason: 'Email delivery failed',
					}),
				);
			}
		} catch (err) {
			this.logger.error(`Email reminder failed for ${email}: ${err.message}`);
			await this.notificationRepository.save(
				this.notificationRepository.create({
					tenantId: tenant.tenantId,
					invoiceId: invoice.invoiceId,
					type,
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
