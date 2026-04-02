import { Injectable } from '@nestjs/common';
import { OrgContextService } from '@/common/services/org-context.service';
import { DataSource, In, Not } from 'typeorm';
import { Property } from '@/modules/properties/entities/property.entity';
import { Unit } from '@/modules/units/entities/unit.entity';
import { Tenant, TenantStatus } from '@/modules/tenants/entities/tenant.entity';
import { Invoice, InvoiceStatus } from '@/modules/invoices/entities/invoice.entity';
import { Payment } from '@/modules/payments/entities/payment.entity';
import { Expense, ExpenseStatus } from '@/modules/expenses/entities/expense.entity';
import { MaintenanceRequest } from '@/modules/maintenance/entities/maintenance-request.entity';
import { ExpensePriority } from '@/modules/expenses/entities/expense.entity';

@Injectable()
export class DashboardService {
	constructor(
		private readonly dataSource: DataSource,
		private readonly orgContext: OrgContextService,
	) {}

	private get orgId(): string | null {
		return this.orgContext.isSuperAdmin ? null : this.orgContext.organizationId;
	}

	private applyOrgScope(qb: import('typeorm').SelectQueryBuilder<any>, alias: string): void {
		if (this.orgId) {
			qb.andWhere(`${alias}.organization_id = :orgId`, { orgId: this.orgId });
		}
	}

	async getStats() {
		const propertyRepo = this.dataSource.getRepository(Property);
		const unitRepo = this.dataSource.getRepository(Unit);
		const tenantRepo = this.dataSource.getRepository(Tenant);
		const invoiceRepo = this.dataSource.getRepository(Invoice);
		const paymentRepo = this.dataSource.getRepository(Payment);
		const expenseRepo = this.dataSource.getRepository(Expense);

		const orgWhere = this.orgId ? { organizationId: this.orgId } : {};

		// Count properties
		const totalProperties = await propertyRepo.count({ where: orgWhere });

		// Count units
		const totalUnits = await unitRepo.count({ where: orgWhere });
		const occupiedUnits = await unitRepo.count({ where: { ...orgWhere, isOccupied: true } });
		const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;

		// Count tenants
		const totalTenants = await tenantRepo.count({ where: orgWhere });
		const activeTenants = await tenantRepo.count({ where: { ...orgWhere, status: TenantStatus.ACTIVE } });

		// Revenue (sum of amountPaid across all non-cancelled invoices)
		const revenueQb = invoiceRepo
			.createQueryBuilder('invoice')
			.select('COALESCE(SUM(invoice.amount_paid), 0)', 'total')
			.where('invoice.status != :cancelled', { cancelled: InvoiceStatus.CANCELLED });
		this.applyOrgScope(revenueQb, 'invoice');
		const revenueResult = await revenueQb.getRawOne();
		const totalRevenue = parseFloat(revenueResult?.total || '0');

		// Outstanding balance (sum of balanceDue for unpaid/partially_paid/overdue invoices)
		const outstandingQb = invoiceRepo
			.createQueryBuilder('invoice')
			.select('COALESCE(SUM(invoice.balance_due), 0)', 'total')
			.where('invoice.status IN (:...statuses)', {
				statuses: [InvoiceStatus.UNPAID, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE],
			});
		this.applyOrgScope(outstandingQb, 'invoice');
		const outstandingResult = await outstandingQb.getRawOne();
		const outstandingBalance = parseFloat(outstandingResult?.total || '0');

		// Collection rate
		const billedQb = invoiceRepo
			.createQueryBuilder('invoice')
			.select('COALESCE(SUM(invoice.total_amount), 0)', 'total');
		this.applyOrgScope(billedQb, 'invoice');
		const totalBilledResult = await billedQb.getRawOne();
		const totalBilled = parseFloat(totalBilledResult?.total || '0');
		const collectionRate = totalBilled > 0 ? (totalRevenue / totalBilled) * 100 : 0;

		// Total expenses
		const expenseQb = expenseRepo
			.createQueryBuilder('expense')
			.select('COALESCE(SUM(expense.amount), 0)', 'total');
		this.applyOrgScope(expenseQb, 'expense');
		const expenseResult = await expenseQb.getRawOne();
		const totalExpenses = parseFloat(expenseResult?.total || '0');

		// Overdue invoices count
		const overdueInvoices = await invoiceRepo.count({
			where: { ...orgWhere, status: InvoiceStatus.OVERDUE },
		});

		// Recent invoices (last 5) — use raw select to avoid serialization issues
		const recentInvoicesQb = invoiceRepo
			.createQueryBuilder('invoice')
			.leftJoin('invoice.tenant', 'tenant')
			.leftJoin('tenant.user', 'invUser')
			.select([
				'invoice.invoice_id AS "invoiceId"',
				'invoice.invoice_number AS "invoiceNumber"',
				'invoice.total_amount AS "totalAmount"',
				'invoice.balance_due AS "balanceDue"',
				'invoice.status AS "status"',
				'invoice.due_date AS "dueDate"',
				'CONCAT("invUser"."firstName", \' \', "invUser"."lastName") AS "tenantName"',
			])
			.orderBy('invoice.created_at', 'DESC')
			.limit(5);
		this.applyOrgScope(recentInvoicesQb, 'invoice');
		const recentInvoices = (await recentInvoicesQb.getRawMany()).map((r) => ({
			invoiceId: r.invoiceId,
			invoiceNumber: r.invoiceNumber,
			totalAmount: parseFloat(r.totalAmount || '0'),
			balanceDue: parseFloat(r.balanceDue || '0'),
			status: r.status,
			dueDate: r.dueDate,
			tenantName: r.tenantName?.trim() || '-',
		}));

		// Recent payments (last 5) — use raw select to avoid serialization issues
		const recentPaymentsQb = paymentRepo
			.createQueryBuilder('payment')
			.leftJoin('payment.tenant', 'tenant')
			.leftJoin('tenant.user', 'payUser')
			.select([
				'payment.payment_id AS "paymentId"',
				'payment.amount AS "amount"',
				'payment.method AS "method"',
				'payment.status AS "status"',
				'payment.transaction_date AS "transactionDate"',
				'CONCAT("payUser"."firstName", \' \', "payUser"."lastName") AS "tenantName"',
			])
			.orderBy('payment.created_at', 'DESC')
			.limit(5);
		this.applyOrgScope(recentPaymentsQb, 'payment');
		const recentPayments = (await recentPaymentsQb.getRawMany()).map((r) => ({
			paymentId: r.paymentId,
			amount: parseFloat(r.amount || '0'),
			method: r.method,
			status: r.status,
			transactionDate: r.transactionDate,
			tenantName: r.tenantName?.trim() || '-',
		}));

		// Maintenance stats
		const maintenanceRepo = this.dataSource.getRepository(MaintenanceRequest);

		const pendingMaintenance = await maintenanceRepo.count({
			where: { ...orgWhere, status: ExpenseStatus.PENDING },
		});

		const urgentMaintenance = await maintenanceRepo.count({
			where: {
				...orgWhere,
				priority: In([ExpensePriority.HIGH, ExpensePriority.URGENT]),
				status: Not(In([ExpenseStatus.COMPLETED, ExpenseStatus.CANCELLED])),
			},
		});

		const recentMaintenanceQb = maintenanceRepo
			.createQueryBuilder('maintenance')
			.leftJoinAndSelect('maintenance.tenant', 'tenant')
			.leftJoinAndSelect('tenant.user', 'user')
			.leftJoinAndSelect('tenant.unit', 'unit')
			.leftJoinAndSelect('unit.property', 'property')
			.orderBy('maintenance.createdAt', 'DESC')
			.take(5);
		this.applyOrgScope(recentMaintenanceQb, 'maintenance');
		const recentMaintenance = await recentMaintenanceQb.getMany();

		return {
			totalProperties,
			totalUnits,
			occupiedUnits,
			occupancyRate,
			totalTenants,
			activeTenants,
			totalRevenue,
			outstandingBalance,
			collectionRate,
			totalExpenses,
			overdueInvoices,
			recentInvoices,
			recentPayments,
			pendingMaintenance,
			urgentMaintenance,
			recentMaintenance,
		};
	}

	/**
	 * Feature 1: Revenue Analytics — monthly revenue trends, collection rates, revenue by property
	 */
	async getRevenueAnalytics(months = 12) {
		const invoiceRepo = this.dataSource.getRepository(Invoice);

		// Monthly revenue + collection rate
		const cutoffDate = new Date();
		cutoffDate.setMonth(cutoffDate.getMonth() - months);

		const monthlyQb = invoiceRepo
			.createQueryBuilder('invoice')
			.select("TO_CHAR(invoice.billing_month, 'YYYY-MM')", 'month')
			.addSelect('COALESCE(SUM(invoice.amount_paid), 0)', 'revenue')
			.addSelect('COALESCE(SUM(invoice.total_amount), 0)', 'target')
			.where('invoice.status != :cancelled', { cancelled: InvoiceStatus.CANCELLED })
			.andWhere('invoice.billing_month >= :cutoffDate', { cutoffDate })
			.groupBy("TO_CHAR(invoice.billing_month, 'YYYY-MM')")
			.orderBy("TO_CHAR(invoice.billing_month, 'YYYY-MM')", 'ASC');
		this.applyOrgScope(monthlyQb, 'invoice');

		const monthlyRows = await monthlyQb.getRawMany();

		const monthlyRevenue = monthlyRows.map((r) => ({
			month: r.month,
			revenue: parseFloat(r.revenue),
			target: parseFloat(r.target),
		}));

		const collectionRate = monthlyRows.map((r) => {
			const target = parseFloat(r.target);
			const revenue = parseFloat(r.revenue);
			return {
				month: r.month,
				rate: target > 0 ? Math.round((revenue / target) * 100 * 10) / 10 : 0,
			};
		});

		// Revenue by property (LEFT JOIN so properties with zero revenue still appear)
		const propertyRepo = this.dataSource.getRepository(Property);
		const propertyQb = propertyRepo
			.createQueryBuilder('property')
			.leftJoin(Unit, 'unit', 'unit.property_id = property.property_id')
			.leftJoin(Tenant, 'tenant', 'tenant.unit_id = unit.unit_id')
			.leftJoin(
				Invoice,
				'invoice',
				'invoice.tenant_id = tenant.tenant_id AND invoice.status != :cancelled',
				{ cancelled: InvoiceStatus.CANCELLED },
			)
			.select('property.name', 'property')
			.addSelect('COALESCE(SUM(invoice.amount_paid), 0)', 'revenue')
			.groupBy('property.property_id')
			.addGroupBy('property.name')
			.orderBy('revenue', 'DESC');
		this.applyOrgScope(propertyQb, 'property');

		const propertyRows = await propertyQb.getRawMany();

		const revenueByProperty = propertyRows.map((r) => ({
			property: r.property,
			revenue: parseFloat(r.revenue),
		}));

		return { monthlyRevenue, collectionRate, revenueByProperty };
	}

	/**
	 * Feature 2: Aging Report — outstanding balances bucketed by age
	 */
	async getAgingReport() {
		const invoiceRepo = this.dataSource.getRepository(Invoice);

		const qb = invoiceRepo
			.createQueryBuilder('invoice')
			.innerJoin('invoice.tenant', 'tenant')
			.innerJoin('tenant.user', 'user')
			.innerJoin('tenant.unit', 'unit')
			.innerJoin('unit.property', 'property')
			.select([
				'CONCAT("user"."firstName", \' \', "user"."lastName") AS "tenantName"',
				'"unit"."unit_number" AS "unitNumber"',
				'"property"."name" AS "propertyName"',
				'"invoice"."invoice_number" AS "invoiceNumber"',
				'"invoice"."due_date" AS "dueDate"',
				'"invoice"."balance_due" AS "balanceDue"',
				'EXTRACT(DAY FROM NOW() - "invoice"."due_date")::int AS "ageDays"',
			])
			.where('invoice.status IN (:...statuses)', {
				statuses: [InvoiceStatus.UNPAID, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE],
			})
			.andWhere('invoice.balance_due > 0')
			.orderBy('"ageDays"', 'DESC');
		this.applyOrgScope(qb, 'invoice');

		const rows: Array<{
			tenantName: string;
			unitNumber: string;
			propertyName: string;
			invoiceNumber: string;
			dueDate: string;
			balanceDue: string;
			ageDays: number;
		}> = await qb.getRawMany();

		const getBucket = (ageDays: number): string => {
			if (ageDays <= 30) return '0-30';
			if (ageDays <= 60) return '31-60';
			if (ageDays <= 90) return '61-90';
			return '90+';
		};

		const details = rows.map((r) => ({
			tenantName: r.tenantName,
			unitNumber: r.unitNumber,
			propertyName: r.propertyName,
			invoiceNumber: r.invoiceNumber,
			dueDate: r.dueDate,
			balanceDue: parseFloat(r.balanceDue),
			ageDays: Math.max(0, r.ageDays),
			bucket: getBucket(Math.max(0, r.ageDays)),
		}));

		const buckets = ['0-30', '31-60', '61-90', '90+'];
		const summary = buckets.map((bucket) => {
			const items = details.filter((d) => d.bucket === bucket);
			return {
				bucket,
				count: items.length,
				totalAmount: items.reduce((sum, d) => sum + d.balanceDue, 0),
			};
		});

		return { summary, details };
	}

	/**
	 * Feature 5: Property P&L — per-property revenue vs expenses
	 */
	async getPropertyPnl(startDate?: string, endDate?: string) {
		const invoiceRepo = this.dataSource.getRepository(Invoice);
		const expenseRepo = this.dataSource.getRepository(Expense);
		const unitRepo = this.dataSource.getRepository(Unit);

		// Revenue by property
		const revenueQb = invoiceRepo
			.createQueryBuilder('invoice')
			.innerJoin('invoice.tenant', 'tenant')
			.innerJoin('tenant.unit', 'unit')
			.innerJoin('unit.property', 'property')
			.select('property.property_id', 'propertyId')
			.addSelect('property.name', 'propertyName')
			.addSelect('COALESCE(SUM(invoice.amount_paid), 0)', 'revenue')
			.where('invoice.status != :cancelled', { cancelled: InvoiceStatus.CANCELLED });
		this.applyOrgScope(revenueQb, 'invoice');

		if (startDate) {
			revenueQb.andWhere('invoice.billing_month >= :startDate', { startDate });
		}
		if (endDate) {
			revenueQb.andWhere('invoice.billing_month <= :endDate', { endDate });
		}

		revenueQb.groupBy('property.property_id').addGroupBy('property.name');
		const revenueRows = await revenueQb.getRawMany();

		// Expenses by property
		const expenseQb = expenseRepo
			.createQueryBuilder('expense')
			.innerJoin('expense.property', 'property')
			.select('property.property_id', 'propertyId')
			.addSelect('property.name', 'propertyName')
			.addSelect('COALESCE(SUM(expense.amount), 0)', 'expenses')
			.where('expense.status IN (:...statuses)', {
				statuses: [ExpenseStatus.APPROVED, ExpenseStatus.COMPLETED],
			});
		this.applyOrgScope(expenseQb, 'expense');

		if (startDate) {
			expenseQb.andWhere('expense.createdAt >= :startDate', { startDate });
		}
		if (endDate) {
			expenseQb.andWhere('expense.createdAt <= :endDate', { endDate });
		}

		expenseQb.groupBy('property.property_id').addGroupBy('property.name');
		const expenseRows = await expenseQb.getRawMany();

		// Merge into per-property P&L
		const revenueMap = new Map(revenueRows.map((r) => [r.propertyId, r]));
		const expenseMap = new Map(expenseRows.map((r) => [r.propertyId, r]));
		const allPropertyIds = new Set([
			...revenueRows.map((r) => r.propertyId),
			...expenseRows.map((r) => r.propertyId),
		]);

		// Get occupancy per property
		const occupancyQb = unitRepo
			.createQueryBuilder('unit')
			.innerJoin('unit.property', 'property')
			.select('property.property_id', 'propertyId')
			.addSelect('COUNT(*)::int', 'unitCount')
			.addSelect('SUM(CASE WHEN unit.is_occupied = true THEN 1 ELSE 0 END)::int', 'occupied')
			.groupBy('property.property_id');
		this.applyOrgScope(occupancyQb, 'unit');
		const occupancyRows = await occupancyQb.getRawMany();
		const occupancyMap = new Map(occupancyRows.map((r) => [r.propertyId, r]));

		let totalRevenue = 0;
		let totalExpenses = 0;

		const properties = Array.from(allPropertyIds).map((propertyId) => {
			const rev = parseFloat(revenueMap.get(propertyId)?.revenue || '0');
			const exp = parseFloat(expenseMap.get(propertyId)?.expenses || '0');
			const name = revenueMap.get(propertyId)?.propertyName || expenseMap.get(propertyId)?.propertyName || 'Unknown';
			const occ = occupancyMap.get(propertyId);
			const unitCount = parseInt(occ?.unitCount || '0', 10);
			const occupied = parseInt(occ?.occupied || '0', 10);
			const occupancyRate = unitCount > 0 ? Math.round((occupied / unitCount) * 100 * 10) / 10 : 0;

			totalRevenue += rev;
			totalExpenses += exp;

			return {
				propertyId,
				propertyName: name,
				revenue: rev,
				expenses: exp,
				netIncome: rev - exp,
				occupancyRate,
				unitCount,
			};
		});

		return {
			properties,
			totals: {
				revenue: totalRevenue,
				expenses: totalExpenses,
				netIncome: totalRevenue - totalExpenses,
			},
		};
	}

	/**
	 * Feature 4: Expiring Leases — tenants with leases ending within N days
	 */
	async getExpiringLeases(withinDays = 90) {
		const tenantRepo = this.dataSource.getRepository(Tenant);

		const maxDate = new Date();
		maxDate.setDate(maxDate.getDate() + withinDays);

		const qb = tenantRepo
			.createQueryBuilder('tenant')
			.innerJoin('tenant.user', 'user')
			.innerJoin('tenant.unit', 'unit')
			.innerJoin('unit.property', 'property')
			.select([
				'"tenant"."tenant_id" AS "tenantId"',
				'CONCAT("user"."firstName", \' \', "user"."lastName") AS "tenantName"',
				'"unit"."unit_number" AS "unitNumber"',
				'"property"."name" AS "propertyName"',
				'"tenant"."lease_end" AS "leaseEnd"',
				'"tenant"."status" AS "status"',
				'EXTRACT(DAY FROM "tenant"."lease_end" - NOW())::int AS "daysRemaining"',
			])
			.where('tenant.status = :status', { status: TenantStatus.ACTIVE })
			.andWhere('tenant.lease_end IS NOT NULL')
			.andWhere('tenant.lease_end <= :maxDate', { maxDate })
			.andWhere('tenant.lease_end >= NOW()')
			.orderBy('"daysRemaining"', 'ASC');
		this.applyOrgScope(qb, 'tenant');

		const rows = await qb.getRawMany();

		return rows.map((r) => ({
			tenantId: r.tenantId,
			tenantName: r.tenantName,
			unitNumber: r.unitNumber,
			propertyName: r.propertyName,
			leaseEnd: r.leaseEnd,
			status: r.status,
			daysRemaining: Math.max(0, r.daysRemaining),
		}));
	}

	/**
	 * Feature 15: Cash Flow Forecast — project future cash flow
	 */
	async getCashFlowForecast(months = 6) {
		const unitRepo = this.dataSource.getRepository(Unit);
		const invoiceRepo = this.dataSource.getRepository(Invoice);
		const expenseRepo = this.dataSource.getRepository(Expense);

		// Total expected rent from occupied units
		const rentQb = unitRepo
			.createQueryBuilder('unit')
			.select('COALESCE(SUM(unit.rent_amount), 0)', 'totalRent')
			.where('unit.is_occupied = true');
		this.applyOrgScope(rentQb, 'unit');
		const rentResult = await rentQb.getRawOne();
		const monthlyRent = parseFloat(rentResult?.totalRent || '0');

		// Historical collection rate (last 6 months)
		const sixMonthsAgo = new Date();
		sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

		const histQb = invoiceRepo
			.createQueryBuilder('invoice')
			.select('COALESCE(SUM(invoice.amount_paid), 0)', 'paid')
			.addSelect('COALESCE(SUM(invoice.total_amount), 0)', 'billed')
			.where('invoice.status != :cancelled', { cancelled: InvoiceStatus.CANCELLED })
			.andWhere('invoice.billing_month >= :sixMonthsAgo', { sixMonthsAgo });
		this.applyOrgScope(histQb, 'invoice');
		const histResult = await histQb.getRawOne();
		const historicalBilled = parseFloat(histResult?.billed || '0');
		const historicalPaid = parseFloat(histResult?.paid || '0');
		const collectionRate = historicalBilled > 0 ? historicalPaid / historicalBilled : 0.85;

		// Average monthly expenses (last 6 months)
		const expQb = expenseRepo
			.createQueryBuilder('expense')
			.select('COALESCE(SUM(expense.amount), 0)', 'total')
			.where('expense.status IN (:...statuses)', {
				statuses: [ExpenseStatus.APPROVED, ExpenseStatus.COMPLETED],
			})
			.andWhere('expense.createdAt >= :sixMonthsAgo', { sixMonthsAgo });
		this.applyOrgScope(expQb, 'expense');
		const expResult = await expQb.getRawOne();
		const avgMonthlyExpenses = parseFloat(expResult?.total || '0') / 6;

		// Project forward
		const now = new Date();
		const forecast = [];
		for (let i = 1; i <= months; i++) {
			const forecastMonth = new Date(now.getFullYear(), now.getMonth() + i, 1);
			const monthLabel = `${forecastMonth.getFullYear()}-${String(forecastMonth.getMonth() + 1).padStart(2, '0')}`;

			forecast.push({
				month: monthLabel,
				expectedRevenue: Math.round(monthlyRent * 100) / 100,
				projectedCollection: Math.round(monthlyRent * collectionRate * 100) / 100,
				projectedExpenses: Math.round(avgMonthlyExpenses * 100) / 100,
				projectedNet: Math.round((monthlyRent * collectionRate - avgMonthlyExpenses) * 100) / 100,
			});
		}

		return { months: forecast };
	}
}
