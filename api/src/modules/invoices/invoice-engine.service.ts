import { AuditAction } from '@/common/enums/audit-action.enum';
import { AuditTargetType } from '@/common/enums/audit-target-type.enum';
import { UserRole } from '@/common/enums/user-role.enum';
import { Payment, PaymentMethod, PaymentStatus } from '@/modules/payments/entities/payment.entity';
import { Tenant, TenantStatus, DepositStatus } from '@/modules/tenants/entities/tenant.entity';
import { Receipt } from '@/modules/receipts/entities/receipt.entity';
import { User } from '@/modules/users/entities/user.entity';
import { Role } from '@/modules/permissions/entities/role.entity';
import { WalletTransaction, WalletTxnType } from '@/modules/wallet/entities/wallet-transaction.entity';
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { SettingsService } from '../settings/settings.service';
import { Invoice, InvoiceStatus } from './entities/invoice.entity';
import { InvoicesRepository } from './invoices.repository';
import { InvoicesService } from './invoices.service';

interface MonthlyInvoiceResult {
	generated: number;
	settled: number;
	partial: number;
	unpaid: number;
}

@Injectable()
export class InvoiceEngineService {
	private readonly logger = new Logger(InvoiceEngineService.name);

	constructor(
		private readonly dataSource: DataSource,
		private readonly invoicesRepository: InvoicesRepository,
		private readonly auditService: AuditService,
		private readonly invoicesService: InvoicesService,
		private readonly settingsService: SettingsService,
	) {}

	/**
	 * Cron job: runs at midnight on the 1st of every month (EAT).
	 */
	@Cron('0 0 1 * *')
	async handleMonthlyInvoiceGeneration(): Promise<void> {
		this.logger.log('Cron triggered: monthly invoice generation');
		await this.generateMonthlyInvoices();
	}

	/**
	 * Generate invoices for all active tenants for the given billing month.
	 * Called on the 1st of each month via cron, or manually.
	 */
	async generateMonthlyInvoices(billingMonth?: Date): Promise<MonthlyInvoiceResult> {
		const billing = this.normalizeBillingMonth(billingMonth);
		const dueDate = this.calculateDueDate(billing);

		this.logger.log(
			`Starting monthly invoice generation for billing month: ${billing.toISOString()}`,
		);

		// Find the landlord user ID for audit logging
		const landlordRole = await this.dataSource.getRepository(Role).findOne({
			where: { name: UserRole.LANDLORD },
		});
		const landlordUser = landlordRole
			? await this.dataSource.getRepository(User).findOne({
					where: { roleId: landlordRole.roleId },
				})
			: null;
		const systemUserId = landlordUser?.userId;

		if (!systemUserId) {
			this.logger.warn('No landlord user found for audit logging, skipping audit entries');
		}

		// Fetch all active tenants with their units loaded
		const activeTenants = await this.dataSource
			.getRepository(Tenant)
			.find({
				where: { status: TenantStatus.ACTIVE },
				relations: { unit: true, user: true },
			});

		this.logger.log(`Found ${activeTenants.length} active tenant(s) to process`);

		// Load recurring charges from settings (once, not per tenant)
		const settings = await this.settingsService.getSettings();
		const enabledCharges = (settings.recurringCharges || []).filter(c => c.enabled);
		const recurringTotal = enabledCharges.reduce((sum, c) => sum + c.amount, 0);
		const recurringDesc = enabledCharges.map(c => c.name).join(', ');

		if (enabledCharges.length > 0) {
			this.logger.log(
				`Recurring charges: ${enabledCharges.length} enabled, total: KES ${recurringTotal} (${recurringDesc})`,
			);
		}

		const result: MonthlyInvoiceResult = {
			generated: 0,
			settled: 0,
			partial: 0,
			unpaid: 0,
		};

		for (const tenant of activeTenants) {
			try {
				// Check if an invoice already exists for this tenant and billing month
				const existingInvoice = await this.invoicesRepository.findOne({
					where: {
						tenantId: tenant.tenantId,
						billingMonth: billing,
					},
				});

				if (existingInvoice) {
					this.logger.warn(
						`Invoice already exists for tenant ${tenant.tenantId} ` +
						`for billing month ${billing.toISOString()}, skipping`,
					);
					continue;
				}

				const { status: settlementResult, invoice: settledInvoice } = await this.generateAndSettleInvoice(
					tenant.tenantId,
					billing,
					dueDate,
					systemUserId,
					recurringTotal,
					recurringDesc,
				);

				// Send notifications based on settlement result (fire-and-forget)
				if (settledInvoice) {
					settledInvoice.tenant = tenant;

					if (settlementResult === InvoiceStatus.PAID) {
						// Fully auto-settled: send receipt only (no invoice)
						const receipt = await this.dataSource.getRepository(Receipt).findOne({
							where: { invoiceId: settledInvoice.invoiceId },
						});
						if (receipt) {
							this.invoicesService.sendReceiptNotification(receipt.receiptId).catch((err) =>
								this.logger.error(`Failed to send receipt notification for ${receipt.receiptNumber}: ${err.message}`),
							);
						}
					} else if (settlementResult === InvoiceStatus.PARTIALLY_PAID) {
						// Partial settlement: send invoice (remaining balance) + receipt (partial payment)
						this.invoicesService.sendInvoiceNotification(settledInvoice).catch((err) =>
							this.logger.error(`Failed to send notification for invoice ${settledInvoice.invoiceNumber}: ${err.message}`),
						);
						const receipt = await this.dataSource.getRepository(Receipt).findOne({
							where: { invoiceId: settledInvoice.invoiceId },
						});
						if (receipt) {
							this.invoicesService.sendReceiptNotification(receipt.receiptId).catch((err) =>
								this.logger.error(`Failed to send receipt notification for ${receipt.receiptNumber}: ${err.message}`),
							);
						}
					} else {
						// Unpaid: send invoice only
						this.invoicesService.sendInvoiceNotification(settledInvoice).catch((err) =>
							this.logger.error(`Failed to send notification for invoice ${settledInvoice.invoiceNumber}: ${err.message}`),
						);
					}
				}

				result.generated++;

				if (settlementResult === InvoiceStatus.PAID) {
					result.settled++;
				} else if (settlementResult === InvoiceStatus.PARTIALLY_PAID) {
					result.partial++;
				} else {
					result.unpaid++;
				}
			} catch (error) {
				this.logger.error(
					`Failed to generate invoice for tenant ${tenant.tenantId}: ${error.message}`,
					error.stack,
				);
				// Continue processing other tenants even if one fails
			}
		}

		this.logger.log(
			`Monthly invoice generation complete. ` +
			`Generated: ${result.generated}, Settled: ${result.settled}, ` +
			`Partial: ${result.partial}, Unpaid: ${result.unpaid}`,
		);

		return result;
	}

	/**
	 * Generate a single invoice for a tenant and attempt auto-settlement.
	 * Uses a TypeORM transaction with pessimistic locking on wallet balance.
	 *
	 * @returns The resulting invoice status after settlement attempt.
	 */
	private async generateAndSettleInvoice(
		tenantId: string,
		billingMonth: Date,
		dueDate: Date,
		systemUserId?: string,
		recurringChargesTotal: number = 0,
		recurringChargesDesc: string = '',
	): Promise<{ status: InvoiceStatus; invoice: Invoice }> {
		const queryRunner = this.dataSource.createQueryRunner();
		await queryRunner.connect();
		await queryRunner.startTransaction();

		try {
			// 1. Lock the tenant row with pessimistic_write using QueryBuilder
			//    (findOne triggers eager-loaded LEFT JOINs which break FOR UPDATE in PostgreSQL)
			const tenant = await queryRunner.manager
				.createQueryBuilder(Tenant, 'tenant')
				.setLock('pessimistic_write')
				.where('tenant.tenantId = :tenantId', { tenantId })
				.getOne();

			if (!tenant) {
				throw new Error(`Tenant with ID ${tenantId} not found`);
			}

			// Load relations separately (eager relations are fine here without the lock)
			const tenantWithRelations = await queryRunner.manager.findOne(Tenant, {
				where: { tenantId },
				relations: { unit: true, user: true },
			});

			if (!tenantWithRelations?.unit) {
				throw new Error(`Tenant ${tenantId} has no assigned unit`);
			}

			const unitNumber = tenantWithRelations.unit.unitNumber;
			const rentAmount = parseFloat(String(tenantWithRelations.unit.rentAmount));
			const tenantName = tenantWithRelations.user
				? `${tenantWithRelations.user.firstName || ''} ${tenantWithRelations.user.lastName || ''}`.trim()
				: tenantId;

			// 2. Generate invoice number: INV-{unitNumber}-{YYYY}-{MM}
			const invoiceNumber = this.generateInvoiceNumber(unitNumber, billingMonth);

			// 3. Calculate invoice totals
			//    For auto-generated invoices, rent + recurring charges from settings.
			//    Water, electricity default to 0 and can be updated manually.
			const waterCharge = 0;
			const electricityCharge = 0;
			const otherCharges = recurringChargesTotal;
			const subtotal = rentAmount + waterCharge + electricityCharge + otherCharges;
			const penaltyAmount = 0;
			const totalAmount = subtotal + penaltyAmount;

			// 4. Create the invoice entity
			const invoice = queryRunner.manager.create(Invoice, {
				invoiceNumber,
				tenantId,
				billingMonth,
				rentAmount,
				waterCharge,
				electricityCharge,
				otherCharges,
				otherChargesDesc: recurringChargesDesc || undefined,
				subtotal,
				penaltyAmount,
				totalAmount,
				amountPaid: 0,
				balanceDue: totalAmount,
				status: InvoiceStatus.UNPAID,
				dueDate,
			});

			const savedInvoice = await queryRunner.manager.save(Invoice, invoice);

			this.logger.log(
				`Generated invoice ${invoiceNumber} for tenant ${tenantName} ` +
				`(${tenantId}), total: KES ${totalAmount}`,
			);

			// 5. Audit: invoice generated
			await this.auditService.createLog({
				action: AuditAction.INVOICE_GENERATED,
				performedBy: systemUserId,
				targetType: AuditTargetType.INVOICE,
				targetId: savedInvoice.invoiceId,
				details: `Auto-generated invoice ${invoiceNumber} for ${tenantName}, total: KES ${totalAmount}`,
				metadata: {
					invoiceId: savedInvoice.invoiceId,
					invoiceNumber,
					tenantId,
					tenantName,
					rentAmount,
					totalAmount,
					billingMonth: billingMonth.toISOString(),
				},
			});

			// 6. Check wallet balance and attempt auto-settlement
			const walletBalance = parseFloat(String(tenant.walletBalance));
			let resultStatus: InvoiceStatus;

			if (walletBalance >= totalAmount) {
				// FULL SETTLEMENT
				resultStatus = await this.settleFullPayment(
					queryRunner,
					savedInvoice,
					tenant,
					walletBalance,
					totalAmount,
					invoiceNumber,
					unitNumber,
					billingMonth,
					tenantName,
					systemUserId,
				);
			} else if (walletBalance > 0 && walletBalance < totalAmount) {
				// PARTIAL SETTLEMENT
				resultStatus = await this.settlePartialPayment(
					queryRunner,
					savedInvoice,
					tenant,
					walletBalance,
					totalAmount,
					invoiceNumber,
					tenantName,
					systemUserId,
				);
			} else {
				// NO WALLET BALANCE — invoice remains UNPAID
				resultStatus = InvoiceStatus.UNPAID;

				this.logger.log(
					`Invoice ${invoiceNumber} sent unpaid to ${tenantName} ` +
					`(wallet balance: KES 0)`,
				);
			}

			await queryRunner.commitTransaction();

			// Re-fetch invoice to get updated state after settlement
			const finalInvoice = await this.invoicesRepository.findOne({
				where: { invoiceId: savedInvoice.invoiceId },
			});

			return { status: resultStatus, invoice: finalInvoice || savedInvoice };
		} catch (error) {
			await queryRunner.rollbackTransaction();
			throw error;
		} finally {
			await queryRunner.release();
		}
	}

	/**
	 * Fully settle an invoice from the tenant's wallet balance.
	 */
	private async settleFullPayment(
		queryRunner: import('typeorm').QueryRunner,
		invoice: Invoice,
		tenant: Tenant,
		walletBalance: number,
		totalAmount: number,
		invoiceNumber: string,
		unitNumber: string,
		billingMonth: Date,
		tenantName: string,
		systemUserId?: string,
	): Promise<InvoiceStatus> {
		const newBalance = parseFloat((walletBalance - totalAmount).toFixed(2));

		// Deduct full amount from wallet
		await queryRunner.manager.update(Tenant, tenant.tenantId, {
			walletBalance: newBalance,
		});

		// Record wallet transaction
		const walletTxn = queryRunner.manager.create(WalletTransaction, {
			tenantId: tenant.tenantId,
			type: WalletTxnType.DEBIT_INVOICE,
			amount: totalAmount,
			balanceBefore: walletBalance,
			balanceAfter: newBalance,
			reference: invoiceNumber,
			description: `Auto-deduction for invoice ${invoiceNumber}`,
		});
		await queryRunner.manager.save(WalletTransaction, walletTxn);

		// Record payment
		const payment = queryRunner.manager.create(Payment, {
			tenantId: tenant.tenantId,
			invoiceId: invoice.invoiceId,
			amount: totalAmount,
			method: PaymentMethod.WALLET_DEDUCTION,
			status: PaymentStatus.COMPLETED,
			transactionDate: new Date(),
		});
		await queryRunner.manager.save(Payment, payment);

		// Mark invoice as PAID
		await queryRunner.manager.update(Invoice, invoice.invoiceId, {
			amountPaid: totalAmount,
			balanceDue: 0,
			status: InvoiceStatus.PAID,
			paidAt: new Date(),
		});

		// Generate receipt
		const receiptNumber = this.generateReceiptNumber(invoiceNumber);
		const receipt = queryRunner.manager.create(Receipt, {
			receiptNumber,
			invoiceId: invoice.invoiceId,
			totalPaid: totalAmount,
		});
		await queryRunner.manager.save(Receipt, receipt);

		// Update deposit status to COLLECTED if this invoice contains a security deposit
		if (invoice.otherChargesDesc?.includes('Security Deposit')) {
			const currentTenant = await queryRunner.manager.findOne(Tenant, { where: { tenantId: tenant.tenantId } });
			if (currentTenant && currentTenant.depositStatus === DepositStatus.PENDING) {
				await queryRunner.manager.update(Tenant, tenant.tenantId, {
					depositStatus: DepositStatus.COLLECTED,
				});
			}
		}

		this.logger.log(
			`Auto-settled invoice ${invoiceNumber} for ${tenantName}. ` +
			`Deducted KES ${totalAmount} from wallet. ` +
			`New wallet balance: KES ${newBalance}`,
		);

		// Audit: wallet debited
		await this.auditService.createLog({
			action: AuditAction.WALLET_DEBITED,
			performedBy: systemUserId,
			targetType: AuditTargetType.WALLET,
			targetId: tenant.tenantId,
			details: `Wallet debited KES ${totalAmount} for invoice ${invoiceNumber}. Balance: KES ${walletBalance} -> KES ${newBalance}`,
			metadata: {
				tenantId: tenant.tenantId,
				tenantName,
				invoiceNumber,
				amount: totalAmount,
				balanceBefore: walletBalance,
				balanceAfter: newBalance,
			},
		});

		// Audit: invoice auto-settled
		await this.auditService.createLog({
			action: AuditAction.INVOICE_AUTO_SETTLED,
			performedBy: systemUserId,
			targetType: AuditTargetType.INVOICE,
			targetId: invoice.invoiceId,
			details: `Auto-settled invoice ${invoiceNumber} for ${tenantName}. Full payment of KES ${totalAmount} from wallet`,
			metadata: {
				invoiceId: invoice.invoiceId,
				invoiceNumber,
				tenantId: tenant.tenantId,
				tenantName,
				totalAmount,
				walletBalanceBefore: walletBalance,
				walletBalanceAfter: newBalance,
			},
		});

		// Audit: receipt generated
		await this.auditService.createLog({
			action: AuditAction.RECEIPT_GENERATED,
			performedBy: systemUserId,
			targetType: AuditTargetType.RECEIPT,
			targetId: receipt.receiptId,
			details: `Generated receipt ${receiptNumber} for invoice ${invoiceNumber}, total paid: KES ${totalAmount}`,
			metadata: {
				receiptId: receipt.receiptId,
				receiptNumber,
				invoiceId: invoice.invoiceId,
				invoiceNumber,
				tenantId: tenant.tenantId,
				totalPaid: totalAmount,
			},
		});

		return InvoiceStatus.PAID;
	}

	/**
	 * Partially settle an invoice from the tenant's wallet balance.
	 */
	private async settlePartialPayment(
		queryRunner: import('typeorm').QueryRunner,
		invoice: Invoice,
		tenant: Tenant,
		walletBalance: number,
		totalAmount: number,
		invoiceNumber: string,
		tenantName: string,
		systemUserId?: string,
	): Promise<InvoiceStatus> {
		const remaining = parseFloat((totalAmount - walletBalance).toFixed(2));

		// Deduct entire wallet balance
		await queryRunner.manager.update(Tenant, tenant.tenantId, {
			walletBalance: 0,
		});

		// Record wallet transaction
		const walletTxn = queryRunner.manager.create(WalletTransaction, {
			tenantId: tenant.tenantId,
			type: WalletTxnType.DEBIT_INVOICE,
			amount: walletBalance,
			balanceBefore: walletBalance,
			balanceAfter: 0,
			reference: invoiceNumber,
			description: `Partial auto-deduction for invoice ${invoiceNumber}`,
		});
		await queryRunner.manager.save(WalletTransaction, walletTxn);

		// Record payment
		const payment = queryRunner.manager.create(Payment, {
			tenantId: tenant.tenantId,
			invoiceId: invoice.invoiceId,
			amount: walletBalance,
			method: PaymentMethod.WALLET_DEDUCTION,
			status: PaymentStatus.COMPLETED,
			transactionDate: new Date(),
		});
		await queryRunner.manager.save(Payment, payment);

		// Update invoice as PARTIALLY_PAID
		await queryRunner.manager.update(Invoice, invoice.invoiceId, {
			amountPaid: walletBalance,
			balanceDue: remaining,
			status: InvoiceStatus.PARTIALLY_PAID,
		});

		// Generate receipt for partial payment
		const receiptNumber = this.generateReceiptNumber(invoiceNumber);
		const receipt = queryRunner.manager.create(Receipt, {
			receiptNumber,
			invoiceId: invoice.invoiceId,
			totalPaid: walletBalance,
		});
		await queryRunner.manager.save(Receipt, receipt);

		this.logger.log(
			`Partial settlement for ${invoiceNumber}. ` +
			`Deducted KES ${walletBalance} from wallet. ` +
			`Remaining balance due: KES ${remaining}`,
		);

		// Audit: receipt generated
		await this.auditService.createLog({
			action: AuditAction.RECEIPT_GENERATED,
			performedBy: systemUserId,
			targetType: AuditTargetType.RECEIPT,
			targetId: receipt.receiptId,
			details: `Generated receipt ${receiptNumber} for partial payment on invoice ${invoiceNumber}, paid: KES ${walletBalance}`,
			metadata: {
				receiptId: receipt.receiptId,
				receiptNumber,
				invoiceId: invoice.invoiceId,
				invoiceNumber,
				tenantId: tenant.tenantId,
				totalPaid: walletBalance,
			},
		});

		// Audit: wallet debited
		await this.auditService.createLog({
			action: AuditAction.WALLET_DEBITED,
			performedBy: systemUserId,
			targetType: AuditTargetType.WALLET,
			targetId: tenant.tenantId,
			details: `Wallet debited KES ${walletBalance} (partial) for invoice ${invoiceNumber}. Balance: KES ${walletBalance} -> KES 0`,
			metadata: {
				tenantId: tenant.tenantId,
				tenantName,
				invoiceNumber,
				amount: walletBalance,
				balanceBefore: walletBalance,
				balanceAfter: 0,
			},
		});

		// Audit: invoice partially settled
		await this.auditService.createLog({
			action: AuditAction.INVOICE_PARTIALLY_SETTLED,
			performedBy: systemUserId,
			targetType: AuditTargetType.INVOICE,
			targetId: invoice.invoiceId,
			details: `Partial settlement for invoice ${invoiceNumber} for ${tenantName}. Paid KES ${walletBalance} from wallet, remaining: KES ${remaining}`,
			metadata: {
				invoiceId: invoice.invoiceId,
				invoiceNumber,
				tenantId: tenant.tenantId,
				tenantName,
				totalAmount,
				amountPaid: walletBalance,
				balanceDue: remaining,
				walletBalanceBefore: walletBalance,
				walletBalanceAfter: 0,
			},
		});

		return InvoiceStatus.PARTIALLY_PAID;
	}

	/**
	 * Generate invoice number in format: INV-{unitNumber}-{YYYY}-{MM}
	 */
	private generateInvoiceNumber(unitNumber: string, billingMonth: Date): string {
		const year = billingMonth.getFullYear();
		const month = String(billingMonth.getMonth() + 1).padStart(2, '0');
		return `INV-${unitNumber}-${year}-${month}`;
	}

	/**
	 * Derive receipt number from invoice number by swapping the INV- prefix.
	 */
	private generateReceiptNumber(invoiceNumber: string): string {
		return invoiceNumber.replace(/^INV-/, 'RCP-');
	}

	/**
	 * Normalize a billing month to the first day of that month at midnight UTC.
	 * If no date is provided, defaults to the current month.
	 */
	private normalizeBillingMonth(billingMonth?: Date): Date {
		const date = billingMonth ? new Date(billingMonth) : new Date();
		return new Date(Date.UTC(date.getFullYear(), date.getMonth(), 1));
	}

	/**
	 * Calculate the due date for a billing month.
	 * Default: 5th of the billing month.
	 */
	private calculateDueDate(billingMonth: Date): Date {
		const dueDayOfMonth = parseInt(process.env.INVOICE_DUE_DAY || '5', 10);
		return new Date(
			Date.UTC(billingMonth.getFullYear(), billingMonth.getMonth(), dueDayOfMonth),
		);
	}
}
