import { AuditAction } from '@/common/enums/audit-action.enum';
import { AuditTargetType } from '@/common/enums/audit-target-type.enum';
import { Inject, Injectable, Logger, NotFoundException, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { SmsService } from '../sms/sms.service';
import { MailService } from '../mail/mail.service';
import { PdfService } from '../pdf/pdf.service';
import { SettingsService } from '../settings/settings.service';
import { Tenant, DepositStatus } from '@/modules/tenants/entities/tenant.entity';
import { Receipt } from '@/modules/receipts/entities/receipt.entity';
import { Notification, NotificationChannel, NotificationStatus, NotificationType } from '@/modules/notifications/entities/notification.entity';
import { Organization } from '@/modules/organizations/entities/organization.entity';
import { InvoicePdfData } from '../pdf/interfaces/pdf-data.interface';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { Invoice, InvoiceStatus, InvoiceType } from './entities/invoice.entity';
import { InvoicesRepository } from './invoices.repository';
import { SettlementCoreService } from './settlement-core.service';

@Injectable()
export class InvoicesService {
	private readonly logger = new Logger(InvoicesService.name);

	constructor(
		private readonly invoicesRepository: InvoicesRepository,
		private readonly auditService: AuditService,
		private readonly smsService: SmsService,
		private readonly mailService: MailService,
		private readonly pdfService: PdfService,
		@Inject(forwardRef(() => SettingsService)) private readonly settingsService: SettingsService,
		private readonly dataSource: DataSource,
		private readonly settlementCoreService: SettlementCoreService,
		@InjectRepository(Tenant)
		private readonly tenantRepository: Repository<Tenant>,
		@InjectRepository(Receipt)
		private readonly receiptRepository: Repository<Receipt>,
		@InjectRepository(Notification)
		private readonly notificationRepository: Repository<Notification>,
		@InjectRepository(Organization)
		private readonly organizationRepository: Repository<Organization>,
	) {}

	private async getOrgBranding(orgId?: string): Promise<{
		name?: string; supportEmail?: string; supportPhone?: string;
		logoUrl?: string; primaryColor?: string; tagline?: string;
	}> {
		if (!orgId) return {};
		try {
			const org = await this.organizationRepository.findOne({ where: { organizationId: orgId } as any });
			if (!org) return {};
			return {
				name: org.name || undefined,
				supportEmail: org.supportEmail || undefined,
				supportPhone: org.supportPhone || undefined,
				logoUrl: org.logoUrl || undefined,
				primaryColor: org.primaryColor || undefined,
				tagline: org.tagline || undefined,
			};
		} catch { return {}; }
	}

	async create(dto: CreateInvoiceDto, userId: string): Promise<Invoice> {
		const isRent = dto.invoiceType === InvoiceType.RENT;
		const rentAmount = dto.rentAmount;
		const waterCharge = isRent ? (dto.waterCharge ?? 0) : 0;
		const electricityCharge = isRent ? (dto.electricityCharge ?? 0) : 0;
		const otherCharges = isRent ? (dto.otherCharges ?? 0) : 0;

		const subtotal = rentAmount + waterCharge + electricityCharge + otherCharges;
		const penaltyAmount = 0;
		const totalAmount = subtotal + penaltyAmount;
		const balanceDue = totalAmount;

		// Generate invoice number: INV-{MM}-{YYYY}-{count}
		const billingDate = new Date(dto.billingMonth);
		const month = String(billingDate.getMonth() + 1).padStart(2, '0');
		const year = billingDate.getFullYear();

		const queryRunner = this.dataSource.createQueryRunner();
		await queryRunner.connect();
		await queryRunner.startTransaction();

		let invoice: Invoice;
		let invoiceNumber: string;

		try {
			// Count existing invoices for this month to generate sequence
			const count = await queryRunner.manager.count(Invoice, {
				where: { billingMonth: billingDate },
			});
			const sequence = String(count + 1).padStart(4, '0');
			invoiceNumber = `INV-${month}-${year}-${sequence}`;

			invoice = await queryRunner.manager.save(
				queryRunner.manager.create(Invoice, {
					invoiceNumber,
					invoiceType: dto.invoiceType,
					tenantId: dto.tenantId || null,
					recipientName: dto.recipientName || undefined,
					billingMonth: billingDate,
					rentAmount,
					waterCharge,
					electricityCharge,
					otherCharges,
					otherChargesDesc: dto.otherChargesDesc,
					subtotal,
					penaltyAmount,
					totalAmount,
					amountPaid: 0,
					balanceDue,
					status: InvoiceStatus.UNPAID,
					dueDate: new Date(dto.dueDate),
					notes: dto.notes,
				}),
			);

			await queryRunner.commitTransaction();
		} catch (err) {
			await queryRunner.rollbackTransaction();
			this.logger.error(`Failed to create invoice: ${err.message}`);
			throw err;
		} finally {
			await queryRunner.release();
		}

		const recipientLabel = dto.tenantId ? `tenant ${dto.tenantId}` : (dto.recipientName || 'unknown');
		await this.auditService.createLog({
			action: AuditAction.INVOICE_GENERATED,
			performedBy: userId,
			targetType: AuditTargetType.INVOICE,
			targetId: invoice.invoiceId,
			details: `Generated ${dto.invoiceType} invoice ${invoiceNumber} for ${recipientLabel}, total: ${totalAmount}`,
			metadata: {
				invoiceId: invoice.invoiceId,
				invoiceNumber,
				invoiceType: dto.invoiceType,
				tenantId: dto.tenantId || null,
				recipientName: dto.recipientName || null,
				totalAmount,
			},
		});

		// Only attempt wallet settlement and send notifications for tenant-linked invoices
		if (dto.tenantId) {
			await this.attemptWalletSettlement(invoice, invoiceNumber, dto.tenantId, totalAmount, userId);

			// Re-fetch with tenant relation to get updated state
			const updatedInvoice = await this.invoicesRepository.findOne({
				where: { invoiceId: invoice.invoiceId },
				relations: { tenant: true },
			});

			// Send notifications based on settlement result (fire-and-forget)
			if (updatedInvoice.status === InvoiceStatus.PAID) {
				const receipt = await this.receiptRepository.findOne({
					where: { invoiceId: updatedInvoice.invoiceId },
				});
				if (receipt) {
					this.sendReceiptNotification(receipt.receiptId).catch((err) =>
						this.logger.error(`Failed to send receipt notification: ${err.message}`),
					);
				}
			} else if (updatedInvoice.status === InvoiceStatus.PARTIALLY_PAID) {
				this.sendInvoiceNotification(updatedInvoice).catch((err) =>
					this.logger.error(`Failed to send invoice notification: ${err.message}`),
				);
				const receipt = await this.receiptRepository.findOne({
					where: { invoiceId: updatedInvoice.invoiceId },
				});
				if (receipt) {
					this.sendReceiptNotification(receipt.receiptId).catch((err) =>
						this.logger.error(`Failed to send receipt notification: ${err.message}`),
					);
				}
			} else {
				this.sendInvoiceNotification(updatedInvoice).catch((err) =>
					this.logger.error(`Failed to send invoice notification: ${err.message}`),
				);
			}

			return updatedInvoice;
		}

		// Non-tenant invoice: just re-fetch and return
		return this.invoicesRepository.findOne({
			where: { invoiceId: invoice.invoiceId },
		});
	}

	/**
	 * Generate a PDF buffer for a given invoice.
	 */
	async generateInvoicePdf(invoiceId: string): Promise<{ buffer: Buffer; filename: string }> {
		const invoice = await this.invoicesRepository.findOne({
			where: { invoiceId },
			relations: { tenant: { user: true, unit: { property: true } } },
		});

		if (!invoice) {
			throw new NotFoundException('Invoice not found');
		}

		const settings = await this.settingsService.getSettings();
		const tenant = invoice.tenant;
		const user = tenant?.user;
		const unit = tenant?.unit;
		const property = unit?.property;
		const branding = await this.getOrgBranding((invoice as any).organizationId);

		// For non-rent invoices without a tenant, use recipientName
		const resolvedName = user
			? `${user.firstName || ''} ${user.lastName || ''}`.trim()
			: (invoice.recipientName || 'Recipient');

		const pdfData: InvoicePdfData = {
			companyName: branding.name || settings.platformName || 'RentFlow',
			companyEmail: branding.supportEmail || settings.supportEmail || 'support@rentflow.co.ke',
			companyPhone: branding.supportPhone || settings.contactPhone || undefined,
			companyAddress: settings.contactAddress || undefined,
			companyLogoUrl: branding.logoUrl || settings.appLogo || undefined,
			primaryColor: branding.primaryColor,
			tagline: branding.tagline,

			invoiceNumber: invoice.invoiceNumber,
			invoiceDate: new Date(invoice.createdAt).toLocaleDateString('en-KE'),
			dueDate: new Date(invoice.dueDate).toLocaleDateString('en-KE'),
			status: invoice.status,

			tenantName: resolvedName,
			tenantPhone: user?.phone || '',
			tenantEmail: user?.email || '',
			unitNumber: unit?.unitNumber || '',
			propertyName: property?.name || '',

			rentAmount: Number(invoice.rentAmount),
			waterCharge: Number(invoice.waterCharge),
			electricityCharge: Number(invoice.electricityCharge),
			otherCharges: Number(invoice.otherCharges),
			otherChargesDesc: invoice.otherChargesDesc,
			penaltyAmount: Number(invoice.penaltyAmount),
			subtotal: Number(invoice.subtotal),
			totalAmount: Number(invoice.totalAmount),
			amountPaid: Number(invoice.amountPaid),
			balanceDue: Number(invoice.balanceDue),

			paybillNumber: property?.paybillNumber || undefined,
			accountRef: unit?.unitNumber || '',
		};

		const buffer = await this.pdfService.generateInvoicePdf(pdfData);
		const filename = `${invoice.invoiceNumber}.pdf`;

		return { buffer, filename };
	}

	/**
	 * Attempt to auto-settle an invoice from the tenant's wallet balance.
	 * Uses pessimistic locking and a single atomic transaction for wallet debit + invoice update.
	 */
	private async attemptWalletSettlement(
		invoice: Invoice,
		invoiceNumber: string,
		tenantId: string,
		totalAmount: number,
		userId: string,
	): Promise<void> {
		const queryRunner = this.dataSource.createQueryRunner();
		await queryRunner.connect();
		await queryRunner.startTransaction();

		try {
			// Lock tenant row with pessimistic_write to prevent race conditions
			const tenant = await queryRunner.manager
				.createQueryBuilder(Tenant, 'tenant')
				.setLock('pessimistic_write')
				.where('tenant.tenantId = :tenantId', { tenantId })
				.getOne();

			if (!tenant || Number(tenant.walletBalance) <= 0) {
				await queryRunner.rollbackTransaction();
				return;
			}

			const result = await this.settlementCoreService.settleInvoicesFromWallet(
				queryRunner,
				tenant,
				[invoice],
				userId,
			);

			if (result.invoiceResults.length === 0 || result.invoiceResults[0].type === 'skipped') {
				await queryRunner.rollbackTransaction();
				return;
			}

			// Update tenant wallet balance atomically
			await queryRunner.manager.update(Tenant, tenantId, {
				walletBalance: result.walletBalanceAfter,
			});

			await queryRunner.commitTransaction();

			// Write audit logs after commit (fire-and-forget)
			for (const log of result.pendingAuditLogs) {
				this.auditService.createLog(log).catch((err) =>
					this.logger.error(`Failed to write audit log: ${err.message}`),
				);
			}

			const invoiceResult = result.invoiceResults[0];
			this.logger.log(
				`${invoiceResult.type === 'full' ? 'Auto-settled' : 'Partial settlement for'} invoice ${invoiceNumber} ` +
				`for tenant ${tenantId}. Deducted KES ${invoiceResult.amountDeducted} from wallet.`,
			);
		} catch (err) {
			await queryRunner.rollbackTransaction();
			this.logger.error(`Failed to settle invoice ${invoiceNumber}: ${err.message}`);
			throw err;
		} finally {
			await queryRunner.release();
		}
	}

	/**
	 * Send invoice notification via SMS + Email (with PDF attachment).
	 * Creates Notification records in the database.
	 */
	async sendInvoiceNotification(invoice: Invoice): Promise<void> {
		// Skip notifications for invoices without a tenant
		if (!invoice.tenantId) {
			this.logger.log(`Skipping notification for non-tenant invoice ${invoice.invoiceNumber}`);
			return;
		}

		// Load tenant with user if not already loaded
		let tenant = invoice.tenant;
		if (!tenant?.user) {
			tenant = await this.tenantRepository.findOne({
				where: { tenantId: invoice.tenantId },
				relations: { user: true },
			});
		}

		if (!tenant?.user) {
			this.logger.warn(`Cannot send notification: tenant or user not found for invoice ${invoice.invoiceNumber}`);
			return;
		}

		const user = tenant.user;
		const billingDate = new Date(invoice.billingMonth);
		const billingMonthStr = billingDate.toLocaleString('en-KE', { month: 'long', year: 'numeric' });
		const dueDateStr = new Date(invoice.dueDate).toLocaleDateString('en-KE');
		const tenantName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Tenant';

		// Generate PDF for email attachment
		let pdfBuffer: Buffer | null = null;
		try {
			const result = await this.generateInvoicePdf(invoice.invoiceId);
			pdfBuffer = result.buffer;
		} catch (err) {
			this.logger.error(`Failed to generate PDF for invoice ${invoice.invoiceNumber}: ${err.message}`);
		}

		// 1. SMS notification (text summary)
		const smsMessage =
			`RentFlow: Invoice ${invoice.invoiceNumber} for ${billingMonthStr}. ` +
			`Total: KES ${Number(invoice.totalAmount).toLocaleString()}. ` +
			`Due: ${dueDateStr}. Status: ${invoice.status.toUpperCase()}.` +
			(Number(invoice.balanceDue) > 0 ? ` Balance due: KES ${Number(invoice.balanceDue).toLocaleString()}.` : '');

		if (user.phone) {
			try {
				const smsResult = await this.smsService.sendSms(user.phone, smsMessage);
				await this.notificationRepository.save(
					this.notificationRepository.create({
						tenantId: invoice.tenantId,
						invoiceId: invoice.invoiceId,
						type: NotificationType.INVOICE_SENT,
						channel: NotificationChannel.SMS,
						message: smsMessage,
						...(smsResult.success
							? { sentAt: new Date(), status: NotificationStatus.SENT }
							: { failReason: 'SMS delivery failed', status: NotificationStatus.FAILED, retryCount: 0 }),
					}),
				);
			} catch (err) {
				this.logger.error(`SMS notification failed for invoice ${invoice.invoiceNumber}: ${err.message}`);
			}
		}

		// 2. Email notification (with PDF attachment)
		if (user.email) {
			try {
				const subject = `RentFlow Invoice ${invoice.invoiceNumber} — ${billingMonthStr}`;
				const html = this.buildInvoiceEmailHtml(invoice, tenantName, billingMonthStr, dueDateStr);

				const attachments = pdfBuffer
					? [{ filename: `${invoice.invoiceNumber}.pdf`, content: pdfBuffer }]
					: undefined;

				const emailResult = await this.mailService.sendEmail({ to: user.email, subject, html, attachments });
				await this.notificationRepository.save(
					this.notificationRepository.create({
						tenantId: invoice.tenantId,
						invoiceId: invoice.invoiceId,
						type: NotificationType.INVOICE_SENT,
						channel: NotificationChannel.EMAIL,
						subject,
						message: `Invoice email sent to ${user.email}`,
						...(emailResult
							? { sentAt: new Date(), status: NotificationStatus.SENT }
							: { failReason: 'Email delivery failed', status: NotificationStatus.FAILED, retryCount: 0 }),
					}),
				);
			} catch (err) {
				this.logger.error(`Email notification failed for invoice ${invoice.invoiceNumber}: ${err.message}`);
			}
		}

	}

	/**
	 * Send receipt notification via SMS + Email (with PDF attachment).
	 */
	async sendReceiptNotification(receiptId: string): Promise<void> {
		const receipt = await this.receiptRepository.findOne({
			where: { receiptId },
			relations: { invoice: { tenant: { user: true, unit: { property: true } } } },
		});

		if (!receipt?.invoice?.tenant?.user) {
			this.logger.warn(`Cannot send receipt notification: missing relations for receipt ${receiptId}`);
			return;
		}

		const invoice = receipt.invoice;
		const tenant = invoice.tenant;
		const user = tenant.user;
		const unit = tenant.unit;
		const property = unit?.property;
		const tenantName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Tenant';
		const billingDate = new Date(invoice.billingMonth);
		const billingMonthStr = billingDate.toLocaleString('en-KE', { month: 'long', year: 'numeric' });

		// Generate receipt PDF
		let pdfBuffer: Buffer | null = null;
		try {
			const settings = await this.settingsService.getSettings();
			const receiptBranding = await this.getOrgBranding((invoice as any).organizationId);
			pdfBuffer = await this.pdfService.generateReceiptPdf({
				companyName: receiptBranding.name || settings.platformName || 'RentFlow',
				companyEmail: receiptBranding.supportEmail || settings.supportEmail || 'support@rentflow.co.ke',
				companyPhone: receiptBranding.supportPhone || settings.contactPhone || undefined,
				companyAddress: settings.contactAddress || undefined,
				companyLogoUrl: receiptBranding.logoUrl || settings.appLogo || undefined,
				primaryColor: receiptBranding.primaryColor,
				tagline: receiptBranding.tagline,

				receiptNumber: receipt.receiptNumber,
				receiptDate: new Date(receipt.createdAt).toLocaleDateString('en-KE'),
				invoiceNumber: invoice.invoiceNumber,

				tenantName,
				tenantPhone: user.phone || '',
				tenantEmail: user.email || '',
				unitNumber: unit?.unitNumber || '',
				propertyName: property?.name || '',

				totalPaid: Number(receipt.totalPaid),
				rentAmount: Number(invoice.rentAmount),
				waterCharge: Number(invoice.waterCharge),
				electricityCharge: Number(invoice.electricityCharge),
				otherCharges: Number(invoice.otherCharges),
				otherChargesDesc: invoice.otherChargesDesc,
				penaltyAmount: Number(invoice.penaltyAmount),
				totalAmount: Number(invoice.totalAmount),
			});
		} catch (err) {
			this.logger.error(`Failed to generate receipt PDF for ${receipt.receiptNumber}: ${err.message}`);
		}

		// 1. SMS
		const smsMessage =
			`RentFlow: Receipt ${receipt.receiptNumber} for ${billingMonthStr}. ` +
			`Total paid: KES ${Number(receipt.totalPaid).toLocaleString()}. ` +
			`Invoice ${invoice.invoiceNumber} is now PAID. Thank you!`;

		if (user.phone) {
			try {
				const smsResult = await this.smsService.sendSms(user.phone, smsMessage);
				await this.notificationRepository.save(
					this.notificationRepository.create({
						tenantId: tenant.tenantId,
						invoiceId: invoice.invoiceId,
						type: NotificationType.RECEIPT_SENT,
						channel: NotificationChannel.SMS,
						message: smsMessage,
						...(smsResult.success
							? { sentAt: new Date(), status: NotificationStatus.SENT }
							: { failReason: 'SMS delivery failed', status: NotificationStatus.FAILED }),
					}),
				);
			} catch (err) {
				this.logger.error(`SMS receipt notification failed for ${receipt.receiptNumber}: ${err.message}`);
			}
		}

		// 2. Email with PDF
		if (user.email) {
			try {
				const subject = `RentFlow Receipt ${receipt.receiptNumber} — ${billingMonthStr}`;
				const html = `
					<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
						<h2 style="color:#52c41a">Payment Receipt</h2>
						<p>Dear ${tenantName},</p>
						<p>Thank you for your payment! Your receipt <strong>${receipt.receiptNumber}</strong> for <strong>${billingMonthStr}</strong> is attached.</p>
						<p><strong>Total Paid:</strong> KES ${Number(receipt.totalPaid).toLocaleString()}</p>
						<p><strong>Invoice:</strong> ${invoice.invoiceNumber}</p>
						<p style="color:#52c41a;font-weight:bold">This invoice has been fully paid.</p>
						${pdfBuffer ? '<p>Please find the receipt PDF attached to this email.</p>' : ''}
						<hr style="border:none;border-top:1px solid #eee;margin:24px 0" />
						<p style="color:#999;font-size:12px">This is an automated message from RentFlow.</p>
					</div>
				`;

				const attachments = pdfBuffer
					? [{ filename: `${receipt.receiptNumber}.pdf`, content: pdfBuffer }]
					: undefined;

				const emailResult = await this.mailService.sendEmail({ to: user.email, subject, html, attachments });
				await this.notificationRepository.save(
					this.notificationRepository.create({
						tenantId: tenant.tenantId,
						invoiceId: invoice.invoiceId,
						type: NotificationType.RECEIPT_SENT,
						channel: NotificationChannel.EMAIL,
						subject,
						message: `Receipt email sent to ${user.email}`,
						...(emailResult
							? { sentAt: new Date(), status: NotificationStatus.SENT }
							: { failReason: 'Email delivery failed', status: NotificationStatus.FAILED }),
					}),
				);
			} catch (err) {
				this.logger.error(`Email receipt notification failed for ${receipt.receiptNumber}: ${err.message}`);
			}
		}

	}

	private buildInvoiceEmailHtml(
		invoice: Invoice,
		tenantName: string,
		billingMonth: string,
		dueDate: string,
	): string {
		const row = (label: string, amount: number) =>
			`<tr><td style="padding:8px 12px;border-bottom:1px solid #eee">${label}</td>` +
			`<td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right">KES ${Number(amount).toLocaleString()}</td></tr>`;

		return `
			<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
				<h2 style="color:#1a1a1a">RentFlow Invoice</h2>
				<p>Dear ${tenantName},</p>
				<p>Your invoice <strong>${invoice.invoiceNumber}</strong> for <strong>${billingMonth}</strong> has been generated.</p>
				<table style="width:100%;border-collapse:collapse;margin:16px 0">
					<thead>
						<tr style="background:#f5f5f5">
							<th style="padding:8px 12px;text-align:left">Item</th>
							<th style="padding:8px 12px;text-align:right">Amount</th>
						</tr>
					</thead>
					<tbody>
						${row('Rent', invoice.rentAmount)}
						${Number(invoice.waterCharge) > 0 ? row('Water', invoice.waterCharge) : ''}
						${Number(invoice.electricityCharge) > 0 ? row('Electricity', invoice.electricityCharge) : ''}
						${Number(invoice.otherCharges) > 0 ? row(invoice.otherChargesDesc || 'Other Charges', invoice.otherCharges) : ''}
						${Number(invoice.penaltyAmount) > 0 ? row('Penalty', invoice.penaltyAmount) : ''}
					</tbody>
					<tfoot>
						<tr style="font-weight:bold;background:#f5f5f5">
							<td style="padding:8px 12px">Total</td>
							<td style="padding:8px 12px;text-align:right">KES ${Number(invoice.totalAmount).toLocaleString()}</td>
						</tr>
						${Number(invoice.amountPaid) > 0 ? `
						<tr>
							<td style="padding:8px 12px;color:#52c41a">Amount Paid</td>
							<td style="padding:8px 12px;text-align:right;color:#52c41a">KES ${Number(invoice.amountPaid).toLocaleString()}</td>
						</tr>` : ''}
						${Number(invoice.balanceDue) > 0 ? `
						<tr style="font-weight:bold">
							<td style="padding:8px 12px;color:#ff4d4f">Balance Due</td>
							<td style="padding:8px 12px;text-align:right;color:#ff4d4f">KES ${Number(invoice.balanceDue).toLocaleString()}</td>
						</tr>` : ''}
					</tfoot>
				</table>
				<p><strong>Status:</strong> ${invoice.status.toUpperCase()}</p>
				<p><strong>Due Date:</strong> ${dueDate}</p>
				${invoice.status === InvoiceStatus.PAID ? '<p style="color:#52c41a;font-weight:bold">This invoice has been fully paid. Thank you!</p>' : ''}
				<hr style="border:none;border-top:1px solid #eee;margin:24px 0" />
				<p style="color:#999;font-size:12px">This is an automated message from RentFlow. Please do not reply directly.</p>
			</div>
		`;
	}

	async findAll({
		page = 1,
		limit = 10,
		tenantId,
		status,
		billingMonth,
	}: {
		page: number;
		limit: number;
		tenantId?: string;
		status?: InvoiceStatus;
		billingMonth?: string;
	}): Promise<{
		data: Invoice[];
		pagination: {
			page: number;
			limit: number;
			total: number;
			totalPages: number;
		};
	}> {
		const skip = (page - 1) * limit;

		const queryBuilder = this.invoicesRepository
			.createQueryBuilder('invoice')
			.leftJoinAndSelect('invoice.tenant', 'tenant')
			.leftJoinAndSelect('tenant.user', 'user')
			.orderBy('invoice.createdAt', 'DESC')
			.skip(skip)
			.take(limit);

		if (tenantId) {
			queryBuilder.andWhere('invoice.tenantId = :tenantId', { tenantId });
		}

		if (status) {
			queryBuilder.andWhere('invoice.status = :status', { status });
		}

		if (billingMonth) {
			queryBuilder.andWhere('invoice.billingMonth = :billingMonth', {
				billingMonth: new Date(billingMonth),
			});
		}

		const [invoices, total] = await queryBuilder.getManyAndCount();

		return {
			data: invoices,
			pagination: {
				page,
				limit,
				total,
				totalPages: Math.ceil(total / limit),
			},
		};
	}

	async findOne(invoiceId: string): Promise<Invoice> {
		const invoice = await this.invoicesRepository.findOne({
			where: { invoiceId },
			relations: { tenant: { user: true } },
		});

		if (!invoice) {
			throw new NotFoundException('Invoice not found');
		}

		return invoice;
	}

	async findByTenant(
		tenantId: string,
		{ page = 1, limit = 10 }: { page: number; limit: number },
	): Promise<{
		data: Invoice[];
		pagination: {
			page: number;
			limit: number;
			total: number;
			totalPages: number;
		};
	}> {
		const skip = (page - 1) * limit;

		const queryBuilder = this.invoicesRepository
			.createQueryBuilder('invoice')
			.leftJoinAndSelect('invoice.tenant', 'tenant')
			.where('invoice.tenantId = :tenantId', { tenantId })
			.orderBy('invoice.createdAt', 'DESC')
			.skip(skip)
			.take(limit);

		const [invoices, total] = await queryBuilder.getManyAndCount();

		return {
			data: invoices,
			pagination: {
				page,
				limit,
				total,
				totalPages: Math.ceil(total / limit),
			},
		};
	}

	async updatePayment(invoiceId: string, amountPaid: number): Promise<Invoice> {
		const invoice = await this.findOne(invoiceId);

		const newAmountPaid = Number(invoice.amountPaid) + amountPaid;
		const newBalanceDue = Number(invoice.totalAmount) - newAmountPaid;

		let newStatus: InvoiceStatus;
		if (newBalanceDue <= 0) {
			newStatus = InvoiceStatus.PAID;
		} else if (newAmountPaid > 0) {
			newStatus = InvoiceStatus.PARTIALLY_PAID;
		} else {
			newStatus = invoice.status;
		}

		const queryRunner = this.dataSource.createQueryRunner();
		await queryRunner.connect();
		await queryRunner.startTransaction();

		try {
			await queryRunner.manager.update(Invoice, { invoiceId }, {
				amountPaid: newAmountPaid,
				balanceDue: Math.max(newBalanceDue, 0),
				status: newStatus,
				...(newStatus === InvoiceStatus.PAID ? { paidAt: new Date() } : {}),
			} as any);

			// Update deposit status to COLLECTED if this invoice contains a security deposit
			if (newStatus === InvoiceStatus.PAID && invoice.tenantId && invoice.otherChargesDesc?.includes('Security Deposit')) {
				const tenant = await queryRunner.manager.findOne(Tenant, { where: { tenantId: invoice.tenantId } });
				if (tenant && tenant.depositStatus === DepositStatus.PENDING) {
					await queryRunner.manager.update(Tenant, invoice.tenantId, {
						depositStatus: DepositStatus.COLLECTED,
					});
				}
			}

			await queryRunner.commitTransaction();
		} catch (err) {
			await queryRunner.rollbackTransaction();
			throw err;
		} finally {
			await queryRunner.release();
		}

		return this.findOne(invoiceId);
	}

	async update(invoiceId: string, dto: UpdateInvoiceDto, userId: string): Promise<Invoice> {
		const invoice = await this.findOne(invoiceId);

		const updateData: Partial<Invoice> = {};

		if (dto.invoiceType !== undefined) updateData.invoiceType = dto.invoiceType;
		if (dto.recipientName !== undefined) updateData.recipientName = dto.recipientName;
		if (dto.rentAmount !== undefined) updateData.rentAmount = dto.rentAmount;
		if (dto.waterCharge !== undefined) updateData.waterCharge = dto.waterCharge;
		if (dto.electricityCharge !== undefined) updateData.electricityCharge = dto.electricityCharge;
		if (dto.otherCharges !== undefined) updateData.otherCharges = dto.otherCharges;
		if (dto.otherChargesDesc !== undefined) updateData.otherChargesDesc = dto.otherChargesDesc;
		if (dto.dueDate !== undefined) updateData.dueDate = new Date(dto.dueDate);
		if (dto.billingMonth !== undefined) updateData.billingMonth = new Date(dto.billingMonth);
		if (dto.status !== undefined) updateData.status = dto.status;
		if (dto.notes !== undefined) updateData.notes = dto.notes;

		// Recalculate totals if any charge field changed
		if (
			dto.rentAmount !== undefined ||
			dto.waterCharge !== undefined ||
			dto.electricityCharge !== undefined ||
			dto.otherCharges !== undefined
		) {
			const rent = dto.rentAmount ?? Number(invoice.rentAmount);
			const water = dto.waterCharge ?? Number(invoice.waterCharge);
			const electricity = dto.electricityCharge ?? Number(invoice.electricityCharge);
			const other = dto.otherCharges ?? Number(invoice.otherCharges);

			updateData.subtotal = rent + water + electricity + other;
			updateData.totalAmount = updateData.subtotal + Number(invoice.penaltyAmount);
			updateData.balanceDue = updateData.totalAmount - Number(invoice.amountPaid);
		}

		const queryRunner = this.dataSource.createQueryRunner();
		await queryRunner.connect();
		await queryRunner.startTransaction();

		try {
			await queryRunner.manager.update(Invoice, { invoiceId }, updateData as any);
			await queryRunner.commitTransaction();
		} catch (err) {
			await queryRunner.rollbackTransaction();
			throw err;
		} finally {
			await queryRunner.release();
		}

		await this.auditService.createLog({
			action: AuditAction.INVOICE_UPDATED,
			performedBy: userId,
			targetType: AuditTargetType.INVOICE,
			targetId: invoiceId,
			details: `Updated invoice ${invoice.invoiceNumber}`,
			metadata: {
				invoiceId,
				invoiceNumber: invoice.invoiceNumber,
				updatedFields: Object.keys(updateData),
			},
		});

		return this.findOne(invoiceId);
	}

	async disputeInvoice(
		invoiceId: string,
		reason: string,
		comment: string,
		userId: string,
	): Promise<{ message: string }> {
		const invoice = await this.findOne(invoiceId);

		// Create a notification for the admin about the dispute
		const reasonLabels: Record<string, string> = {
			incorrect_rent: 'Incorrect rent amount',
			wrong_utilities: 'Wrong water/electricity charges',
			already_paid: 'Already paid (not reflected)',
			unfair_penalty: 'Penalty applied unfairly',
			duplicate: 'Duplicate invoice',
			other: 'Other',
		};

		const tenant = await this.tenantRepository.findOne({
			where: { tenantId: invoice.tenantId },
			relations: ['user', 'unit', 'unit.property'],
		});

		const tenantName = tenant?.user ? `${tenant.user.firstName} ${tenant.user.lastName}` : 'Unknown';
		const unitNumber = tenant?.unit?.unitNumber || 'N/A';

		const disputeMessage =
			`Invoice Dispute: ${invoice.invoiceNumber}\n` +
			`Tenant: ${tenantName} (Unit ${unitNumber})\n` +
			`Reason: ${reasonLabels[reason] || reason}\n` +
			`Details: ${comment}`;

		// Save as a notification record for audit trail
		const notification = this.notificationRepository.create({
			tenantId: invoice.tenantId,
			invoiceId: invoice.invoiceId,
			type: NotificationType.GENERAL,
			channel: NotificationChannel.EMAIL,
			subject: `Invoice Dispute: ${invoice.invoiceNumber}`,
			message: disputeMessage,
			status: NotificationStatus.PENDING,
		});
		await this.notificationRepository.save(notification);

		await this.auditService.createLog({
			action: AuditAction.INVOICE_DISPUTED,
			performedBy: userId,
			targetType: AuditTargetType.INVOICE,
			targetId: invoiceId,
			details: `Tenant disputed invoice ${invoice.invoiceNumber}: ${reasonLabels[reason] || reason}`,
			metadata: {
				invoiceId,
				invoiceNumber: invoice.invoiceNumber,
				reason,
				comment,
				tenantName,
				unitNumber,
			},
		});

		this.logger.log(`Invoice ${invoice.invoiceNumber} disputed by ${tenantName}: ${reason}`);

		return { message: 'Dispute submitted successfully' };
	}
}
