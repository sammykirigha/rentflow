import { OrgContextService } from '@/common/services/org-context.service';
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { Invoice } from '@/modules/invoices/entities/invoice.entity';
import { Expense } from '@/modules/expenses/entities/expense.entity';
import { Property } from '@/modules/properties/entities/property.entity';
import { Unit } from '@/modules/units/entities/unit.entity';
import { Tenant } from '@/modules/tenants/entities/tenant.entity';
import { MaintenanceRequest } from '@/modules/maintenance/entities/maintenance-request.entity';
import { Organization } from '@/modules/organizations/entities/organization.entity';
import { SystemSetting } from '@/modules/settings/entities/system-setting.entity';
import { PdfService } from '@/modules/pdf/pdf.service';
import { AuditService } from '@/modules/audit/audit.service';
import { AuditAction } from '@/common/enums/audit-action.enum';
import { AuditTargetType } from '@/common/enums/audit-target-type.enum';
import { OwnerReportPdfData } from '@/modules/pdf/interfaces/pdf-data.interface';

@Injectable()
export class ReportsService {
	private readonly logger = new Logger(ReportsService.name);

	constructor(
		private readonly dataSource: DataSource,
		private readonly orgContext: OrgContextService,
		private readonly pdfService: PdfService,
		private readonly auditService: AuditService,
	) {}

	async getTaxSummary(year: number, quarter?: number) {
		const orgId = this.orgContext.organizationId;

		let startDate: Date;
		let endDate: Date;

		if (quarter) {
			const startMonth = (quarter - 1) * 3;
			startDate = new Date(Date.UTC(year, startMonth, 1));
			endDate = new Date(Date.UTC(year, startMonth + 3, 0, 23, 59, 59));
		} else {
			startDate = new Date(Date.UTC(year, 0, 1));
			endDate = new Date(Date.UTC(year, 11, 31, 23, 59, 59));
		}

		// Revenue: sum of amount_paid from invoices
		const revenueResult = await this.dataSource
			.getRepository(Invoice)
			.createQueryBuilder('inv')
			.select('COALESCE(SUM(inv.amount_paid), 0)', 'totalRevenue')
			.addSelect('COUNT(*)::int', 'invoiceCount')
			.where('inv.organization_id = :orgId', { orgId })
			.andWhere('inv.billing_month BETWEEN :startDate AND :endDate', { startDate, endDate })
			.getRawOne();

		// Expenses by category
		const expensesByCategory = await this.dataSource
			.getRepository(Expense)
			.createQueryBuilder('exp')
			.select('exp.category', 'category')
			.addSelect('COALESCE(SUM(exp.amount), 0)', 'total')
			.addSelect('COUNT(*)::int', 'count')
			.where('exp.organization_id = :orgId', { orgId })
			.andWhere('exp.created_at BETWEEN :startDate AND :endDate', { startDate, endDate })
			.andWhere("exp.status IN ('approved', 'completed')")
			.groupBy('exp.category')
			.orderBy('total', 'DESC')
			.getRawMany();

		const totalExpenses = expensesByCategory.reduce(
			(sum: number, e: any) => sum + parseFloat(e.total || '0'), 0,
		);

		const totalRevenue = parseFloat(revenueResult?.totalRevenue || '0');

		return {
			period: {
				year,
				quarter: quarter || null,
				startDate: startDate.toISOString().slice(0, 10),
				endDate: endDate.toISOString().slice(0, 10),
			},
			income: {
				totalRevenue,
				invoiceCount: parseInt(revenueResult?.invoiceCount || '0', 10),
			},
			expenses: {
				totalExpenses,
				byCategory: expensesByCategory.map((e: any) => ({
					category: e.category,
					total: parseFloat(e.total || '0'),
					count: parseInt(e.count || '0', 10),
				})),
			},
			netTaxableIncome: totalRevenue - totalExpenses,
		};
	}

	async getExpenseBreakdown(startDate: string, endDate: string) {
		const orgId = this.orgContext.organizationId;

		const expenses = await this.dataSource
			.getRepository(Expense)
			.createQueryBuilder('exp')
			.leftJoinAndSelect('exp.property', 'property')
			.leftJoinAndSelect('exp.vendor', 'vendor')
			.where('exp.organization_id = :orgId', { orgId })
			.andWhere('exp.created_at BETWEEN :startDate AND :endDate', {
				startDate: new Date(startDate),
				endDate: new Date(endDate),
			})
			.andWhere("exp.status IN ('approved', 'completed')")
			.orderBy('exp.created_at', 'DESC')
			.getMany();

		const byCategory: Record<string, { total: number; count: number; items: any[] }> = {};

		for (const exp of expenses) {
			if (!byCategory[exp.category]) {
				byCategory[exp.category] = { total: 0, count: 0, items: [] };
			}
			byCategory[exp.category].total += Number(exp.amount);
			byCategory[exp.category].count += 1;
			byCategory[exp.category].items.push({
				expenseId: exp.expenseId,
				description: exp.description,
				amount: Number(exp.amount),
				date: exp.createdAt,
				property: exp.property?.name || '-',
				vendor: exp.vendor?.name || '-',
			});
		}

		const total = Object.values(byCategory).reduce((sum, c) => sum + c.total, 0);

		return {
			period: { startDate, endDate },
			total,
			byCategory,
		};
	}

	async generateOwnerReport(month?: string): Promise<Buffer> {
		const orgId = this.orgContext.organizationId;

		// Determine report month
		const reportDate = month ? new Date(month + '-01') : new Date();
		if (!month) {
			// Default to previous month
			reportDate.setMonth(reportDate.getMonth() - 1);
		}
		const year = reportDate.getFullYear();
		const monthNum = reportDate.getMonth();
		const startDate = new Date(Date.UTC(year, monthNum, 1));
		const endDate = new Date(Date.UTC(year, monthNum + 1, 0, 23, 59, 59));
		const monthLabel = startDate.toLocaleDateString('en-KE', { month: 'long', year: 'numeric' });

		// Revenue
		const revenueResult = await this.dataSource
			.getRepository(Invoice)
			.createQueryBuilder('inv')
			.select('COALESCE(SUM(inv.amount_paid), 0)', 'totalRevenue')
			.addSelect('COALESCE(SUM(inv.total_amount), 0)', 'totalInvoiced')
			.where('inv.organization_id = :orgId', { orgId })
			.andWhere('inv.billing_month BETWEEN :startDate AND :endDate', { startDate, endDate })
			.getRawOne();

		const totalRevenue = parseFloat(revenueResult?.totalRevenue || '0');
		const totalInvoiced = parseFloat(revenueResult?.totalInvoiced || '0');
		const collectionRate = totalInvoiced > 0 ? (totalRevenue / totalInvoiced) * 100 : 0;

		// Expenses
		const expenseResult = await this.dataSource
			.getRepository(Expense)
			.createQueryBuilder('exp')
			.select('COALESCE(SUM(exp.amount), 0)', 'totalExpenses')
			.where('exp.organization_id = :orgId', { orgId })
			.andWhere('exp.created_at BETWEEN :startDate AND :endDate', { startDate, endDate })
			.andWhere("exp.status IN ('approved', 'completed')")
			.getRawOne();

		const totalExpenses = parseFloat(expenseResult?.totalExpenses || '0');

		// Properties breakdown
		const properties = await this.dataSource
			.getRepository(Property)
			.createQueryBuilder('prop')
			.where('prop.organization_id = :orgId', { orgId })
			.andWhere('prop.is_active = :isActive', { isActive: true })
			.getMany();

		const propertyBreakdown: OwnerReportPdfData['properties'] = [];
		let totalUnits = 0;
		let occupiedUnits = 0;

		for (const prop of properties) {
			const units = await this.dataSource
				.getRepository(Unit)
				.createQueryBuilder('u')
				.where('u.property_id = :propertyId', { propertyId: prop.propertyId })
				.getMany();

			const unitCount = units.length;
			const occupied = units.filter((u) => u.isOccupied).length;
			totalUnits += unitCount;
			occupiedUnits += occupied;

			// Revenue for this property
			const propRevenue = await this.dataSource
				.getRepository(Invoice)
				.createQueryBuilder('inv')
				.innerJoin('inv.tenant', 'tenant')
				.innerJoin('tenant.unit', 'unit')
				.select('COALESCE(SUM(inv.amount_paid), 0)', 'revenue')
				.where('unit.property_id = :propertyId', { propertyId: prop.propertyId })
				.andWhere('inv.organization_id = :orgId', { orgId })
				.andWhere('inv.billing_month BETWEEN :startDate AND :endDate', { startDate, endDate })
				.getRawOne();

			// Expenses for this property
			const propExpenses = await this.dataSource
				.getRepository(Expense)
				.createQueryBuilder('exp')
				.select('COALESCE(SUM(exp.amount), 0)', 'expenses')
				.where('exp.property_id = :propertyId', { propertyId: prop.propertyId })
				.andWhere('exp.organization_id = :orgId', { orgId })
				.andWhere('exp.created_at BETWEEN :startDate AND :endDate', { startDate, endDate })
				.andWhere("exp.status IN ('approved', 'completed')")
				.getRawOne();

			const rev = parseFloat(propRevenue?.revenue || '0');
			const exp = parseFloat(propExpenses?.expenses || '0');

			propertyBreakdown.push({
				name: prop.name,
				units: unitCount,
				occupied,
				revenue: rev,
				expenses: exp,
				netIncome: rev - exp,
			});
		}

		// Top debtors (tenants with highest outstanding balance)
		const debtors = await this.dataSource
			.getRepository(Invoice)
			.createQueryBuilder('inv')
			.innerJoin('inv.tenant', 'tenant')
			.innerJoin('tenant.user', 'user')
			.innerJoin('tenant.unit', 'unit')
			.innerJoin('unit.property', 'property')
			.select('CONCAT("user"."firstName", \' \', "user"."lastName")', 'tenantName')
			.addSelect('unit.unit_number', 'unitNumber')
			.addSelect('property.name', 'propertyName')
			.addSelect('COALESCE(SUM(inv.balance_due), 0)', 'totalOwed')
			.where('inv.organization_id = :orgId', { orgId })
			.andWhere('inv.balance_due > 0')
			.andWhere("inv.status IN ('unpaid', 'partially_paid', 'overdue')")
			.groupBy('"user"."firstName"')
			.addGroupBy('"user"."lastName"')
			.addGroupBy('unit.unit_number')
			.addGroupBy('property.name')
			.orderBy('"totalOwed"', 'DESC')
			.limit(10)
			.getRawMany();

		// Maintenance
		const allMaintenance = await this.dataSource
			.getRepository(MaintenanceRequest)
			.createQueryBuilder('mr')
			.where('mr.organization_id = :orgId', { orgId })
			.andWhere('mr.created_at BETWEEN :startDate AND :endDate', { startDate, endDate })
			.getMany();

		const maintenanceStats = {
			open: allMaintenance.filter((m) => ['pending', 'approved', 'in_progress'].includes(m.status)).length,
			resolved: allMaintenance.filter((m) => m.status === 'completed').length,
			urgent: allMaintenance.filter((m) => m.priority === 'urgent' && m.status !== 'completed' && m.status !== 'cancelled').length,
		};

		// Company info from settings + org
		let settings: SystemSetting | null = null;
		try {
			settings = await this.dataSource.getRepository(SystemSetting).findOne({
				where: { organizationId: orgId } as any,
			});
		} catch { /* ignore */ }

		let org: Organization | null = null;
		try {
			org = await this.dataSource.getRepository(Organization).findOne({
				where: { organizationId: orgId } as any,
			});
		} catch { /* ignore */ }

		const vacantUnits = totalUnits - occupiedUnits;

		const pdfData: OwnerReportPdfData = {
			companyName: org?.name || settings?.platformName || 'RentFlow',
			companyEmail: org?.supportEmail || settings?.supportEmail || '',
			companyPhone: org?.supportPhone || settings?.contactPhone,
			companyAddress: settings?.contactAddress,
			companyLogoUrl: org?.logoUrl || settings?.appLogo,
			primaryColor: org?.primaryColor,
			tagline: org?.tagline,
			reportMonth: monthLabel,
			generatedAt: new Date().toLocaleDateString('en-KE', {
				year: 'numeric',
				month: 'long',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit',
			}),
			totalRevenue,
			totalExpenses,
			netIncome: totalRevenue - totalExpenses,
			collectionRate,
			totalUnits,
			occupiedUnits,
			vacantUnits,
			occupancyRate: totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0,
			properties: propertyBreakdown,
			topDebtors: debtors.map((d: any) => ({
				tenantName: d.tenantName || 'Unknown',
				unitNumber: d.unitNumber || '',
				propertyName: d.propertyName || '',
				totalOwed: parseFloat(d.totalOwed || '0'),
			})),
			maintenanceOpen: maintenanceStats.open,
			maintenanceResolved: maintenanceStats.resolved,
			maintenanceUrgent: maintenanceStats.urgent,
		};

		const buffer = await this.pdfService.generateOwnerReportPdf(pdfData);

		try {
			await this.auditService.createLog({
				action: AuditAction.OWNER_REPORT_GENERATED,
				performedBy: 'system',
				targetType: AuditTargetType.REPORT,
				targetId: 'owner-report-' + month,
				details: `Generated owner report for ${monthLabel}`,
				metadata: { month: monthLabel },
			});
		} catch { /* audit log failure should not block report */ }

		return buffer;
	}

	@Cron('0 3 3 * *') // 3rd of each month at 3 AM
	async generateMonthlyOwnerReports() {
		this.logger.log('Starting monthly owner report generation');

		try {
			const orgs = await this.dataSource
				.getRepository(Organization)
				.createQueryBuilder('org')
				.getMany();

			for (const org of orgs) {
				try {
					// Set org context for each org
					(this.orgContext as any).orgId = org.organizationId;

					const prevMonth = new Date();
					prevMonth.setMonth(prevMonth.getMonth() - 1);
					const month = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;

					await this.generateOwnerReport(month);
					this.logger.log(`Owner report generated for org ${org.name}`);
				} catch (err) {
					this.logger.error(`Failed to generate owner report for org ${org.organizationId}: ${err.message}`);
				}
			}
		} catch (err) {
			this.logger.error(`Monthly owner report generation failed: ${err.message}`);
		}
	}
}
