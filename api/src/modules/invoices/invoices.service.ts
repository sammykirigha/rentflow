import { AuditAction } from '@/common/enums/audit-action.enum';
import { AuditTargetType } from '@/common/enums/audit-target-type.enum';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { SmsService } from '../sms/sms.service';
import { MailService } from '../mail/mail.service';
import { WalletService } from '../wallet/wallet.service';
import { PdfService } from '../pdf/pdf.service';
import { SettingsService } from '../settings/settings.service';
import { Tenant } from '@/modules/tenants/entities/tenant.entity';
import { Receipt } from '@/modules/receipts/entities/receipt.entity';
import { Notification, NotificationChannel, NotificationStatus, NotificationType } from '@/modules/notifications/entities/notification.entity';
import { InvoicePdfData } from '../pdf/interfaces/pdf-data.interface';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { Invoice, InvoiceStatus } from './entities/invoice.entity';
import { InvoicesRepository } from './invoices.repository';

@Injectable()
export class InvoicesService {
	private readonly logger = new Logger(InvoicesService.name);

	constructor(
		private readonly invoicesRepository: InvoicesRepository,
		private readonly auditService: AuditService,
		private readonly smsService: SmsService,
		private readonly mailService: MailService,
		private readonly walletService: WalletService,
		private readonly pdfService: PdfService,
		private readonly settingsService: SettingsService,
		private readonly dataSource: DataSource,
		@InjectRepository(Tenant)
		private readonly tenantRepository: Repository<Tenant>,
		@InjectRepository(Receipt)
		private readonly receiptRepository: Repository<Receipt>,
		@InjectRepository(Notification)
		private readonly notificationRepository: Repository<Notification>,
	) {}

	async create(dto: CreateInvoiceDto, userId: string): Promise<Invoice> {
		const rentAmount = dto.rentAmount;
		const waterCharge = dto.waterCharge ?? 0;
		const electricityCharge = dto.electricityCharge ?? 0;
		const otherCharges = dto.otherCharges ?? 0;

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
					tenantId: dto.tenantId,
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

		await this.auditService.createLog({
			action: AuditAction.INVOICE_GENERATED,
			performedBy: userId,
			targetType: AuditTargetType.INVOICE,
			targetId: invoice.invoiceId,
			details: `Generated invoice ${invoiceNumber} for tenant ${dto.tenantId}, total: ${totalAmount}`,
			metadata: {
				invoiceId: invoice.invoiceId,
				invoiceNumber,
				tenantId: dto.tenantId,
				totalAmount,
			},
		});

		// Attempt wallet auto-settlement
		await this.attemptWalletSettlement(invoice, invoiceNumber, dto.tenantId, totalAmount, userId);

		// Re-fetch with tenant relation to get updated state
		const updatedInvoice = await this.invoicesRepository.findOne({
			where: { invoiceId: invoice.invoiceId },
			relations: { tenant: true },
		});

		// Send notification (fire-and-forget)
		this.sendInvoiceNotification(updatedInvoice).catch((err) =>
			this.logger.error(`Failed to send invoice notification: ${err.message}`),
		);

		return updatedInvoice;
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

		const pdfData: InvoicePdfData = {
			companyName: settings.platformName || 'RentFlow',
			companyEmail: settings.supportEmail || 'support@rentflow.co.ke',
			companyPhone: settings.contactPhone || undefined,
			companyAddress: settings.contactAddress || undefined,

			invoiceNumber: invoice.invoiceNumber,
			invoiceDate: new Date(invoice.createdAt).toLocaleDateString('en-KE'),
			dueDate: new Date(invoice.dueDate).toLocaleDateString('en-KE'),
			status: invoice.status,

			tenantName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Tenant',
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
	 */
	private async attemptWalletSettlement(
		invoice: Invoice,
		invoiceNumber: string,
		tenantId: string,
		totalAmount: number,
		userId: string,
	): Promise<void> {
		const tenant = await this.tenantRepository.findOne({
			where: { tenantId },
			relations: { unit: true },
		});

		if (!tenant) return;

		const walletBalance = Number(tenant.walletBalance);
		if (walletBalance <= 0) return;

		if (walletBalance >= totalAmount) {
			// Full settlement — wallet debit is its own transaction
			await this.walletService.debitForInvoice(
				tenantId,
				totalAmount,
				invoiceNumber,
				`Auto-deduction for invoice ${invoiceNumber}`,
			);

			// Invoice update + receipt creation in a transaction
			const queryRunner = this.dataSource.createQueryRunner();
			await queryRunner.connect();
			await queryRunner.startTransaction();

			try {
				await queryRunner.manager.update(Invoice, { invoiceId: invoice.invoiceId }, {
					amountPaid: totalAmount,
					balanceDue: 0,
					status: InvoiceStatus.PAID,
					paidAt: new Date(),
				} as any);

				const unitNumber = tenant.unit?.unitNumber || 'UNKNOWN';
				const billingMonth = invoice.billingMonth;
				const rcpYear = new Date(billingMonth).getFullYear();
				const rcpMonth = String(new Date(billingMonth).getMonth() + 1).padStart(2, '0');
				const receiptNumber = `RCP-${unitNumber}-${rcpYear}-${rcpMonth}`;

				await queryRunner.manager.save(
					queryRunner.manager.create(Receipt, {
						receiptNumber,
						invoiceId: invoice.invoiceId,
						totalPaid: totalAmount,
					}),
				);

				await queryRunner.commitTransaction();
			} catch (err) {
				await queryRunner.rollbackTransaction();
				this.logger.error(`Failed to settle invoice ${invoiceNumber}: ${err.message}`);
				throw err;
			} finally {
				await queryRunner.release();
			}

			this.logger.log(
				`Auto-settled invoice ${invoiceNumber} for tenant ${tenantId}. ` +
				`Deducted KES ${totalAmount} from wallet.`,
			);

			await this.auditService.createLog({
				action: AuditAction.INVOICE_AUTO_SETTLED,
				performedBy: userId,
				targetType: AuditTargetType.INVOICE,
				targetId: invoice.invoiceId,
				details: `Auto-settled invoice ${invoiceNumber}. Full payment of KES ${totalAmount} from wallet`,
				metadata: {
					invoiceId: invoice.invoiceId,
					invoiceNumber,
					tenantId,
					totalAmount,
				},
			});
		} else {
			// Partial settlement — wallet debit is its own transaction
			const remaining = parseFloat((totalAmount - walletBalance).toFixed(2));

			await this.walletService.debitForInvoice(
				tenantId,
				walletBalance,
				invoiceNumber,
				`Partial auto-deduction for invoice ${invoiceNumber}`,
			);

			const queryRunner = this.dataSource.createQueryRunner();
			await queryRunner.connect();
			await queryRunner.startTransaction();

			try {
				await queryRunner.manager.update(Invoice, { invoiceId: invoice.invoiceId }, {
					amountPaid: walletBalance,
					balanceDue: remaining,
					status: InvoiceStatus.PARTIALLY_PAID,
				} as any);

				await queryRunner.commitTransaction();
			} catch (err) {
				await queryRunner.rollbackTransaction();
				this.logger.error(`Failed to partially settle invoice ${invoiceNumber}: ${err.message}`);
				throw err;
			} finally {
				await queryRunner.release();
			}

			this.logger.log(
				`Partial settlement for ${invoiceNumber}. ` +
				`Deducted KES ${walletBalance} from wallet. Remaining: KES ${remaining}`,
			);

			await this.auditService.createLog({
				action: AuditAction.INVOICE_PARTIALLY_SETTLED,
				performedBy: userId,
				targetType: AuditTargetType.INVOICE,
				targetId: invoice.invoiceId,
				details: `Partial settlement for invoice ${invoiceNumber}. Paid KES ${walletBalance} from wallet, remaining: KES ${remaining}`,
				metadata: {
					invoiceId: invoice.invoiceId,
					invoiceNumber,
					tenantId,
					amountPaid: walletBalance,
					balanceDue: remaining,
				},
			});
		}
	}

	/**
	 * Send invoice notification via SMS + Email (with PDF) + WhatsApp (fire-and-forget).
	 * Creates Notification records in the database.
	 */
	async sendInvoiceNotification(invoice: Invoice): Promise<void> {
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
		}

		// 2. Email notification (with PDF attachment)
		if (user.email) {
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
		}

		// 3. WhatsApp notification (rich text summary)
		if (user.phone) {
			const whatsappMessage =
				`*RentFlow Invoice*\n\n` +
				`Invoice: *${invoice.invoiceNumber}*\n` +
				`Period: ${billingMonthStr}\n` +
				`Due Date: ${dueDateStr}\n\n` +
				`Rent: KES ${Number(invoice.rentAmount).toLocaleString()}\n` +
				(Number(invoice.waterCharge) > 0 ? `Water: KES ${Number(invoice.waterCharge).toLocaleString()}\n` : '') +
				(Number(invoice.electricityCharge) > 0 ? `Electricity: KES ${Number(invoice.electricityCharge).toLocaleString()}\n` : '') +
				(Number(invoice.otherCharges) > 0 ? `Other: KES ${Number(invoice.otherCharges).toLocaleString()}\n` : '') +
				(Number(invoice.penaltyAmount) > 0 ? `Penalty: KES ${Number(invoice.penaltyAmount).toLocaleString()}\n` : '') +
				`\n*Total: KES ${Number(invoice.totalAmount).toLocaleString()}*\n` +
				(Number(invoice.amountPaid) > 0 ? `Paid: KES ${Number(invoice.amountPaid).toLocaleString()}\n` : '') +
				(Number(invoice.balanceDue) > 0 ? `*Balance Due: KES ${Number(invoice.balanceDue).toLocaleString()}*\n` : '') +
				`\nStatus: ${invoice.status.toUpperCase()}`;

			const waResult = await this.smsService.sendWhatsApp(user.phone, whatsappMessage);
			await this.notificationRepository.save(
				this.notificationRepository.create({
					tenantId: invoice.tenantId,
					invoiceId: invoice.invoiceId,
					type: NotificationType.INVOICE_SENT,
					channel: NotificationChannel.WHATSAPP,
					message: whatsappMessage,
					...(waResult.success
						? { sentAt: new Date(), status: NotificationStatus.SENT }
						: { failReason: 'WhatsApp delivery failed', status: NotificationStatus.FAILED, retryCount: 0 }),
				}),
			);
		}
	}

	/**
	 * Send receipt notification via SMS + Email (with PDF) + WhatsApp.
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
			pdfBuffer = await this.pdfService.generateReceiptPdf({
				companyName: settings.platformName || 'RentFlow',
				companyEmail: settings.supportEmail || 'support@rentflow.co.ke',
				companyPhone: settings.contactPhone || undefined,
				companyAddress: settings.contactAddress || undefined,

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
		}

		// 2. Email with PDF
		if (user.email) {
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
		}

		// 3. WhatsApp
		if (user.phone) {
			const waMessage =
				`*RentFlow Payment Receipt*\n\n` +
				`Receipt: *${receipt.receiptNumber}*\n` +
				`Invoice: ${invoice.invoiceNumber}\n` +
				`Period: ${billingMonthStr}\n` +
				`Total Paid: *KES ${Number(receipt.totalPaid).toLocaleString()}*\n\n` +
				`Status: PAID IN FULL\n` +
				`Thank you for your payment!`;

			const waResult = await this.smsService.sendWhatsApp(user.phone, waMessage);
			await this.notificationRepository.save(
				this.notificationRepository.create({
					tenantId: tenant.tenantId,
					invoiceId: invoice.invoiceId,
					type: NotificationType.RECEIPT_SENT,
					channel: NotificationChannel.WHATSAPP,
					message: waMessage,
					...(waResult.success
						? { sentAt: new Date(), status: NotificationStatus.SENT }
						: { failReason: 'WhatsApp delivery failed', status: NotificationStatus.FAILED }),
				}),
			);
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
}
