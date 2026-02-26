import { Injectable } from '@nestjs/common';
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
	constructor(private readonly dataSource: DataSource) {}

	async getStats() {
		const propertyRepo = this.dataSource.getRepository(Property);
		const unitRepo = this.dataSource.getRepository(Unit);
		const tenantRepo = this.dataSource.getRepository(Tenant);
		const invoiceRepo = this.dataSource.getRepository(Invoice);
		const paymentRepo = this.dataSource.getRepository(Payment);
		const expenseRepo = this.dataSource.getRepository(Expense);

		// Count properties
		const totalProperties = await propertyRepo.count();

		// Count units
		const totalUnits = await unitRepo.count();
		const occupiedUnits = await unitRepo.count({ where: { isOccupied: true } });
		const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;

		// Count tenants
		const totalTenants = await tenantRepo.count();
		const activeTenants = await tenantRepo.count({ where: { status: TenantStatus.ACTIVE } });

		// Revenue (sum of amountPaid across all non-cancelled invoices)
		const revenueResult = await invoiceRepo
			.createQueryBuilder('invoice')
			.select('COALESCE(SUM(invoice.amount_paid), 0)', 'total')
			.where('invoice.status != :cancelled', { cancelled: InvoiceStatus.CANCELLED })
			.getRawOne();
		const totalRevenue = parseFloat(revenueResult?.total || '0');

		// Outstanding balance (sum of balanceDue for unpaid/partially_paid/overdue invoices)
		const outstandingResult = await invoiceRepo
			.createQueryBuilder('invoice')
			.select('COALESCE(SUM(invoice.balance_due), 0)', 'total')
			.where('invoice.status IN (:...statuses)', {
				statuses: [InvoiceStatus.UNPAID, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE],
			})
			.getRawOne();
		const outstandingBalance = parseFloat(outstandingResult?.total || '0');

		// Collection rate
		const totalBilledResult = await invoiceRepo
			.createQueryBuilder('invoice')
			.select('COALESCE(SUM(invoice.total_amount), 0)', 'total')
			.getRawOne();
		const totalBilled = parseFloat(totalBilledResult?.total || '0');
		const collectionRate = totalBilled > 0 ? (totalRevenue / totalBilled) * 100 : 0;

		// Total expenses
		const expenseResult = await expenseRepo
			.createQueryBuilder('expense')
			.select('COALESCE(SUM(expense.amount), 0)', 'total')
			.getRawOne();
		const totalExpenses = parseFloat(expenseResult?.total || '0');

		// Overdue invoices count
		const overdueInvoices = await invoiceRepo.count({
			where: { status: InvoiceStatus.OVERDUE },
		});

		// Recent invoices (last 5)
		const recentInvoices = await invoiceRepo.find({
			order: { createdAt: 'DESC' },
			take: 5,
			relations: ['tenant'],
		});

		// Recent payments (last 5)
		const recentPayments = await paymentRepo.find({
			order: { createdAt: 'DESC' },
			take: 5,
			relations: ['tenant'],
		});

		// Maintenance stats
		const maintenanceRepo = this.dataSource.getRepository(MaintenanceRequest);

		const pendingMaintenance = await maintenanceRepo.count({
			where: { status: ExpenseStatus.PENDING },
		});

		const urgentMaintenance = await maintenanceRepo.count({
			where: {
				priority: In([ExpensePriority.HIGH, ExpensePriority.URGENT]),
				status: Not(In([ExpenseStatus.COMPLETED, ExpenseStatus.CANCELLED])),
			},
		});

		const recentMaintenance = await maintenanceRepo.find({
			order: { createdAt: 'DESC' },
			take: 5,
			relations: ['tenant', 'tenant.user', 'tenant.unit', 'tenant.unit.property'],
		});

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
}
