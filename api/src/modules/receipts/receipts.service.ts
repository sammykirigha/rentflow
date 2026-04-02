import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from '@/modules/organizations/entities/organization.entity';
import { PdfService } from '../pdf/pdf.service';
import { SettingsService } from '../settings/settings.service';
import { ReceiptsRepository } from './receipts.repository';
import { Receipt } from './entities/receipt.entity';

@Injectable()
export class ReceiptsService {
	private readonly logger = new Logger(ReceiptsService.name);

	constructor(
		private readonly receiptsRepository: ReceiptsRepository,
		private readonly pdfService: PdfService,
		private readonly settingsService: SettingsService,
		@InjectRepository(Organization)
		private readonly organizationRepository: Repository<Organization>,
	) {}

	async findAll({ page = 1, limit = 10 }: { page: number; limit: number }): Promise<{
		data: Receipt[];
		pagination: { page: number; limit: number; total: number; totalPages: number };
	}> {
		const skip = (page - 1) * limit;

		const queryBuilder = this.receiptsRepository
			.createQueryBuilder('receipt')
			.leftJoinAndSelect('receipt.invoice', 'invoice')
			.leftJoinAndSelect('invoice.tenant', 'tenant')
			.leftJoinAndSelect('tenant.user', 'user')
			.orderBy('receipt.createdAt', 'DESC')
			.skip(skip)
			.take(limit);

		const [receipts, total] = await queryBuilder.getManyAndCount();

		return {
			data: receipts,
			pagination: {
				page,
				limit,
				total,
				totalPages: Math.ceil(total / limit),
			},
		};
	}

	async findByTenant(
		tenantId: string,
		{ page = 1, limit = 10 }: { page: number; limit: number },
	): Promise<{
		data: Receipt[];
		pagination: { page: number; limit: number; total: number; totalPages: number };
	}> {
		const skip = (page - 1) * limit;

		const queryBuilder = this.receiptsRepository
			.createQueryBuilder('receipt')
			.leftJoinAndSelect('receipt.invoice', 'invoice')
			.leftJoinAndSelect('invoice.tenant', 'tenant')
			.leftJoinAndSelect('tenant.user', 'user')
			.where('invoice.tenantId = :tenantId', { tenantId })
			.orderBy('receipt.createdAt', 'DESC')
			.skip(skip)
			.take(limit);

		const [receipts, total] = await queryBuilder.getManyAndCount();

		return {
			data: receipts,
			pagination: {
				page,
				limit,
				total,
				totalPages: Math.ceil(total / limit),
			},
		};
	}

	async findOne(receiptId: string): Promise<Receipt> {
		const receipt = await this.receiptsRepository.findOne({
			where: { receiptId },
			relations: { invoice: { tenant: { user: true, unit: { property: true } } } },
		});

		if (!receipt) {
			throw new NotFoundException('Receipt not found');
		}

		return receipt;
	}

	async generateReceiptPdf(receiptId: string): Promise<{ buffer: Buffer; filename: string }> {
		const receipt = await this.findOne(receiptId);
		const invoice = receipt.invoice;
		const tenant = invoice?.tenant;
		const user = tenant?.user;
		const unit = tenant?.unit;
		const property = unit?.property;
		const settings = await this.settingsService.getSettings();

		const tenantName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Tenant';

		let branding: { name?: string; supportEmail?: string; supportPhone?: string; logoUrl?: string; primaryColor?: string; tagline?: string } = {};
		try {
			const orgId = (invoice as any).organizationId;
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

		const buffer = await this.pdfService.generateReceiptPdf({
			companyName: branding.name || settings.platformName || 'RentFlow',
			companyEmail: branding.supportEmail || settings.supportEmail || 'support@rentflow.co.ke',
			companyPhone: branding.supportPhone || settings.contactPhone || undefined,
			companyAddress: settings.contactAddress || undefined,
			companyLogoUrl: branding.logoUrl || settings.appLogo || undefined,
			primaryColor: branding.primaryColor,
			tagline: branding.tagline,

			receiptNumber: receipt.receiptNumber,
			receiptDate: new Date(receipt.createdAt).toLocaleDateString('en-KE'),
			invoiceNumber: invoice.invoiceNumber,

			tenantName,
			tenantPhone: user?.phone || '',
			tenantEmail: user?.email || '',
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

		return { buffer, filename: `${receipt.receiptNumber}.pdf` };
	}
}
