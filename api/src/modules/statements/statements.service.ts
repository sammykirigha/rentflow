import { AuditAction } from '@/common/enums/audit-action.enum';
import { AuditTargetType } from '@/common/enums/audit-target-type.enum';
import { OrgContextService } from '@/common/services/org-context.service';
import { AuditService } from '@/modules/audit/audit.service';
import { Invoice } from '@/modules/invoices/entities/invoice.entity';
import { Notification, NotificationChannel, NotificationStatus, NotificationType } from '@/modules/notifications/entities/notification.entity';
import { Payment } from '@/modules/payments/entities/payment.entity';
import { Organization } from '@/modules/organizations/entities/organization.entity';
import { PdfService } from '@/modules/pdf/pdf.service';
import { SettingsService } from '@/modules/settings/settings.service';
import { Tenant, TenantStatus } from '@/modules/tenants/entities/tenant.entity';
import { WalletTransaction } from '@/modules/wallet/entities/wallet-transaction.entity';
import { MailService } from '@/modules/mail/mail.service';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';

@Injectable()
export class StatementsService {
	private readonly logger = new Logger(StatementsService.name);

	constructor(
		@InjectRepository(Tenant)
		private readonly tenantRepository: Repository<Tenant>,
		@InjectRepository(Invoice)
		private readonly invoiceRepository: Repository<Invoice>,
		@InjectRepository(Payment)
		private readonly paymentRepository: Repository<Payment>,
		@InjectRepository(WalletTransaction)
		private readonly walletTxnRepository: Repository<WalletTransaction>,
		@InjectRepository(Notification)
		private readonly notificationRepository: Repository<Notification>,
		@InjectRepository(Organization)
		private readonly organizationRepository: Repository<Organization>,
		private readonly pdfService: PdfService,
		private readonly settingsService: SettingsService,
		private readonly mailService: MailService,
		private readonly auditService: AuditService,
		private readonly orgContext: OrgContextService,
	) {}

	async generateStatement(tenantId: string, month: string): Promise<Buffer> {
		const tenant = await this.tenantRepository.findOne({
			where: { tenantId },
			relations: ['user', 'unit', 'unit.property'],
		});
		if (!tenant) throw new NotFoundException('Tenant not found');

		const monthDate = new Date(month);
		const startDate = new Date(Date.UTC(monthDate.getFullYear(), monthDate.getMonth(), 1));
		const endDate = new Date(Date.UTC(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59));

		// Get invoices for the month
		const invoices = await this.invoiceRepository.find({
			where: { tenantId, billingMonth: Between(startDate, endDate) },
			order: { createdAt: 'ASC' },
		});

		// Get payments for the month
		const payments = await this.paymentRepository.find({
			where: { tenantId, transactionDate: Between(startDate, endDate) },
			order: { transactionDate: 'ASC' },
		});

		// Get wallet transactions for the month
		const walletTxns = await this.walletTxnRepository.find({
			where: { tenantId, createdAt: Between(startDate, endDate) },
			order: { createdAt: 'ASC' },
		});

		// Build transaction rows
		const transactions: Array<{
			date: string;
			type: string;
			description: string;
			reference: string;
			debit: number;
			credit: number;
			balance: number;
		}> = [];

		let runningBalance = 0;

		// Opening balance: sum of all unpaid invoice balances before this month
		const priorInvoices = await this.invoiceRepository
			.createQueryBuilder('inv')
			.where('inv.tenant_id = :tenantId', { tenantId })
			.andWhere('inv.billing_month < :startDate', { startDate })
			.getMany();

		const openingBalance = priorInvoices.reduce((sum, inv) => sum + Number(inv.balanceDue), 0);
		runningBalance = openingBalance;

		for (const inv of invoices) {
			runningBalance += Number(inv.totalAmount);
			transactions.push({
				date: new Date(inv.createdAt).toLocaleDateString('en-KE'),
				type: 'Invoice',
				description: `Invoice ${inv.invoiceNumber}`,
				reference: inv.invoiceNumber,
				debit: Number(inv.totalAmount),
				credit: 0,
				balance: runningBalance,
			});
		}

		for (const pmt of payments) {
			runningBalance -= Number(pmt.amount);
			transactions.push({
				date: new Date(pmt.transactionDate).toLocaleDateString('en-KE'),
				type: 'Payment',
				description: `Payment via ${pmt.method}`,
				reference: pmt.mpesaReceiptNumber || pmt.paymentId,
				debit: 0,
				credit: Number(pmt.amount),
				balance: runningBalance,
			});
		}

		// Sort by date
		transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

		const totalDebits = transactions.reduce((sum, t) => sum + t.debit, 0);
		const totalCredits = transactions.reduce((sum, t) => sum + t.credit, 0);

		const settings = await this.settingsService.getSettings();
		const user = tenant.user;

		let branding: { name?: string; supportEmail?: string; supportPhone?: string; logoUrl?: string; primaryColor?: string; tagline?: string } = {};
		try {
			const orgId = this.orgContext.organizationId;
			if (orgId) {
				const org = await this.organizationRepository.findOne({ where: { organizationId: orgId } as any });
				if (org) {
					branding = {
						name: org.name || undefined,
						supportEmail: org.supportEmail || undefined,
						supportPhone: org.supportPhone || undefined,
						logoUrl: org.logoUrl || undefined,
						primaryColor: org.primaryColor || undefined,
						tagline: org.tagline || undefined,
					};
				}
			}
		} catch { /* ignore */ }

		const startStr = startDate.toLocaleDateString('en-KE', { month: 'long', year: 'numeric' });

		return this.pdfService.generateStatementPdf({
			companyName: branding.name || settings.platformName || 'RentFlow',
			companyEmail: branding.supportEmail || settings.supportEmail || 'support@rentflow.co.ke',
			companyPhone: branding.supportPhone || settings.contactPhone || undefined,
			companyAddress: settings.contactAddress || undefined,
			companyLogoUrl: branding.logoUrl || settings.appLogo || undefined,
			primaryColor: branding.primaryColor,
			tagline: branding.tagline,

			tenantName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Tenant',
			tenantPhone: user?.phone || '',
			tenantEmail: user?.email || '',
			unitNumber: tenant.unit?.unitNumber || '',
			propertyName: tenant.unit?.property?.name || '',

			startDate: startDate.toLocaleDateString('en-KE'),
			endDate: endDate.toLocaleDateString('en-KE'),

			openingBalance,
			closingBalance: runningBalance,
			totalCredits,
			totalDebits,
			transactions,
		});
	}

	@Cron('0 2 2 * *')
	async generateMonthlyStatements(): Promise<void> {
		this.logger.log('Generating monthly statements...');
		const now = new Date();
		const prevMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth() - 1, 1));
		const monthStr = prevMonth.toISOString().slice(0, 7);

		const tenants = await this.tenantRepository.find({
			where: { status: TenantStatus.ACTIVE },
			relations: ['user', 'unit', 'unit.property'],
		});

		for (const tenant of tenants) {
			try {
				const buffer = await this.generateStatement(tenant.tenantId, `${monthStr}-01`);

				if (tenant.user?.email) {
					const monthLabel = prevMonth.toLocaleDateString('en-KE', { month: 'long', year: 'numeric' });
					await this.mailService.sendEmail({
						to: tenant.user.email,
						subject: `Monthly Statement — ${monthLabel}`,
						html: `<p>Dear ${tenant.user.firstName},</p><p>Please find attached your statement for ${monthLabel}.</p><p>Regards,<br/>RentFlow</p>`,
						attachments: [{ filename: `Statement-${monthStr}.pdf`, content: buffer }],
					});

					await this.notificationRepository.save(
						this.notificationRepository.create({
							tenantId: tenant.tenantId,
							type: NotificationType.STATEMENT_SENT,
							channel: NotificationChannel.EMAIL,
							subject: `Monthly Statement — ${monthLabel}`,
							message: `Statement for ${monthLabel} sent via email`,
							sentAt: new Date(),
							status: NotificationStatus.SENT,
						}),
					);
				}
			} catch (err) {
				this.logger.error(`Failed to generate statement for tenant ${tenant.tenantId}: ${err.message}`);
			}
		}
	}
}
