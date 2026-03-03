import { AuditAction } from '@/common/enums/audit-action.enum';
import { AuditTargetType } from '@/common/enums/audit-target-type.enum';
import { UserRole } from '@/common/enums/user-role.enum';
import { Payment, PaymentMethod, PaymentStatus } from '@/modules/payments/entities/payment.entity';
import { Tenant, DepositStatus } from '@/modules/tenants/entities/tenant.entity';
import { Receipt } from '@/modules/receipts/entities/receipt.entity';
import { User } from '@/modules/users/entities/user.entity';
import { Role } from '@/modules/permissions/entities/role.entity';
import { WalletTransaction, WalletTxnType } from '@/modules/wallet/entities/wallet-transaction.entity';
import { Injectable, Logger } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { Invoice, InvoiceStatus } from './entities/invoice.entity';

export interface InvoiceSettlementResult {
	invoiceId: string;
	invoiceNumber: string;
	type: 'full' | 'partial' | 'skipped';
	amountDeducted: number;
	remainingBalance: number;
}

export interface PendingAuditLog {
	action: AuditAction;
	performedBy?: string;
	targetType: AuditTargetType;
	targetId: string;
	details: string;
	metadata: Record<string, any>;
}

export interface TenantSettlementResult {
	settled: number;
	partial: number;
	walletBalanceBefore: number;
	walletBalanceAfter: number;
	invoiceResults: InvoiceSettlementResult[];
	pendingAuditLogs: PendingAuditLog[];
}

@Injectable()
export class SettlementCoreService {
	private readonly logger = new Logger(SettlementCoreService.name);
	private cachedSystemUserId: string | undefined | null = null;

	constructor(private readonly dataSource: DataSource) {}

	/**
	 * Settle invoices from a tenant's wallet balance within an existing transaction.
	 *
	 * The caller owns the transaction (queryRunner) and is responsible for:
	 * - Starting and committing/rolling back the transaction
	 * - Acquiring a pessimistic_write lock on the tenant row BEFORE calling this method
	 * - Updating tenant.walletBalance to result.walletBalanceAfter after this returns
	 * - Persisting result.pendingAuditLogs after commit (fire-and-forget)
	 *
	 * NOTE: If a landlord updates invoice charges while settlement is running,
	 * the settlement uses the values read at the time of the pessimistic lock.
	 * The next settlement cycle will pick up updated amounts.
	 *
	 * @param queryRunner - Active QueryRunner with an open transaction
	 * @param tenant - Tenant entity locked with pessimistic_write by caller
	 * @param invoices - Invoices to settle, ordered oldest-first
	 * @param systemUserId - Optional user ID for audit log attribution
	 */
	async settleInvoicesFromWallet(
		queryRunner: QueryRunner,
		tenant: Tenant,
		invoices: Invoice[],
		systemUserId?: string,
	): Promise<TenantSettlementResult> {
		const emptyResult: TenantSettlementResult = {
			settled: 0,
			partial: 0,
			walletBalanceBefore: 0,
			walletBalanceAfter: 0,
			invoiceResults: [],
			pendingAuditLogs: [],
		};

		let walletBalance = parseFloat(String(tenant.walletBalance));
		emptyResult.walletBalanceBefore = walletBalance;
		emptyResult.walletBalanceAfter = walletBalance;

		if (walletBalance <= 0 || invoices.length === 0) {
			return emptyResult;
		}

		const result: TenantSettlementResult = {
			settled: 0,
			partial: 0,
			walletBalanceBefore: walletBalance,
			walletBalanceAfter: walletBalance,
			invoiceResults: [],
			pendingAuditLogs: [],
		};

		for (const invoice of invoices) {
			if (walletBalance <= 0) break;

			const balanceDue = parseFloat(String(invoice.balanceDue));
			if (balanceDue <= 0) {
				result.invoiceResults.push({
					invoiceId: invoice.invoiceId,
					invoiceNumber: invoice.invoiceNumber,
					type: 'skipped',
					amountDeducted: 0,
					remainingBalance: balanceDue,
				});
				continue;
			}

			const isFullSettlement = walletBalance >= balanceDue;
			const amountToDeduct = isFullSettlement ? balanceDue : walletBalance;
			const newWalletBalance = this.roundMoney(walletBalance - amountToDeduct);
			const newAmountPaid = this.roundMoney(parseFloat(String(invoice.amountPaid)) + amountToDeduct);
			const newBalanceDue = this.roundMoney(balanceDue - amountToDeduct);

			// 1. Create WalletTransaction
			await queryRunner.manager.save(
				queryRunner.manager.create(WalletTransaction, {
					tenantId: tenant.tenantId,
					type: WalletTxnType.DEBIT_INVOICE,
					amount: amountToDeduct,
					balanceBefore: walletBalance,
					balanceAfter: newWalletBalance,
					reference: invoice.invoiceNumber,
					description: isFullSettlement
						? `Auto-settlement for invoice ${invoice.invoiceNumber}`
						: `Partial auto-settlement for invoice ${invoice.invoiceNumber}`,
				}),
			);

			// 2. Create Payment record
			await queryRunner.manager.save(
				queryRunner.manager.create(Payment, {
					tenantId: tenant.tenantId,
					invoiceId: invoice.invoiceId,
					amount: amountToDeduct,
					method: PaymentMethod.WALLET_DEDUCTION,
					status: PaymentStatus.COMPLETED,
					transactionDate: new Date(),
				}),
			);

			// 3. Update Invoice
			if (isFullSettlement) {
				await queryRunner.manager.update(Invoice, invoice.invoiceId, {
					amountPaid: newAmountPaid,
					balanceDue: 0,
					status: InvoiceStatus.PAID,
					paidAt: new Date(),
				});
			} else {
				await queryRunner.manager.update(Invoice, invoice.invoiceId, {
					amountPaid: newAmountPaid,
					balanceDue: newBalanceDue,
					status: InvoiceStatus.PARTIALLY_PAID,
				});
			}

			// 4. Upsert Receipt (idempotent)
			await this.upsertReceipt(
				queryRunner,
				invoice.invoiceId,
				invoice.invoiceNumber,
				isFullSettlement ? Number(invoice.totalAmount) : newAmountPaid,
			);

			// 5. Maybe collect deposit (only on full settlement)
			await this.maybeCollectDeposit(queryRunner, tenant.tenantId, invoice, isFullSettlement);

			// 6. Collect audit log for deferred persistence
			const auditAction = isFullSettlement
				? AuditAction.INVOICE_AUTO_SETTLED
				: AuditAction.INVOICE_PARTIALLY_SETTLED;

			result.pendingAuditLogs.push({
				action: auditAction,
				performedBy: systemUserId,
				targetType: AuditTargetType.INVOICE,
				targetId: invoice.invoiceId,
				details: isFullSettlement
					? `Wallet auto-settlement: invoice ${invoice.invoiceNumber} fully paid (KES ${amountToDeduct})`
					: `Wallet auto-settlement: partial payment of KES ${amountToDeduct} for invoice ${invoice.invoiceNumber}. Remaining: KES ${newBalanceDue}`,
				metadata: {
					invoiceId: invoice.invoiceId,
					invoiceNumber: invoice.invoiceNumber,
					tenantId: tenant.tenantId,
					amountDeducted: amountToDeduct,
					walletBalanceBefore: walletBalance,
					walletBalanceAfter: newWalletBalance,
					...(isFullSettlement
						? { totalAmount: Number(invoice.totalAmount) }
						: { amountPaid: newAmountPaid, balanceDue: newBalanceDue }),
				},
			});

			result.invoiceResults.push({
				invoiceId: invoice.invoiceId,
				invoiceNumber: invoice.invoiceNumber,
				type: isFullSettlement ? 'full' : 'partial',
				amountDeducted: amountToDeduct,
				remainingBalance: newBalanceDue,
			});

			if (isFullSettlement) {
				result.settled++;
			} else {
				result.partial++;
			}

			walletBalance = newWalletBalance;

			this.logger.log(
				`${isFullSettlement ? 'Auto-settled' : 'Partial settlement'} invoice ${invoice.invoiceNumber}. ` +
				`Deducted KES ${amountToDeduct}. New wallet balance: KES ${newWalletBalance}`,
			);

			if (!isFullSettlement) break; // Wallet exhausted
		}

		result.walletBalanceAfter = walletBalance;
		return result;
	}

	/**
	 * Find the landlord user ID for audit logging. Cached after first call.
	 */
	async getSystemUserId(): Promise<string | undefined> {
		if (this.cachedSystemUserId !== null) {
			return this.cachedSystemUserId;
		}

		const landlordRole = await this.dataSource.getRepository(Role).findOne({
			where: { name: UserRole.LANDLORD },
		});

		if (!landlordRole) {
			this.cachedSystemUserId = undefined;
			return undefined;
		}

		const landlordUser = await this.dataSource.getRepository(User).findOne({
			where: { roleId: landlordRole.roleId },
		});

		this.cachedSystemUserId = landlordUser?.userId;
		return this.cachedSystemUserId;
	}

	/**
	 * Round a monetary value to 2 decimal places.
	 * Uses Math.round to avoid floating-point accumulation errors.
	 */
	private roundMoney(value: number): number {
		return Math.round(value * 100) / 100;
	}

	/**
	 * Create or update a receipt for an invoice (idempotent).
	 * The receipt's totalPaid reflects cumulative payment state, not individual payments.
	 * Individual payments are tracked by Payment records.
	 */
	private async upsertReceipt(
		queryRunner: QueryRunner,
		invoiceId: string,
		invoiceNumber: string,
		totalPaid: number,
	): Promise<Receipt> {
		const existingReceipt = await queryRunner.manager.findOne(Receipt, {
			where: { invoiceId },
		});

		if (existingReceipt) {
			await queryRunner.manager.update(Receipt, existingReceipt.receiptId, {
				totalPaid,
			});
			return existingReceipt;
		}

		const receiptNumber = invoiceNumber.replace(/^INV-/, 'RCP-');
		const receipt = queryRunner.manager.create(Receipt, {
			receiptNumber,
			invoiceId,
			totalPaid,
		});
		return await queryRunner.manager.save(Receipt, receipt);
	}

	/**
	 * Mark deposit as COLLECTED if the invoice contains a security deposit line item.
	 * Only marks as collected on full settlement — partial payments do not satisfy the deposit.
	 */
	private async maybeCollectDeposit(
		queryRunner: QueryRunner,
		tenantId: string,
		invoice: Invoice,
		isFullSettlement: boolean,
	): Promise<void> {
		if (!isFullSettlement) return;
		if (!invoice.otherChargesDesc?.includes('Security Deposit')) return;

		const currentTenant = await queryRunner.manager.findOne(Tenant, {
			where: { tenantId },
		});

		if (currentTenant && currentTenant.depositStatus === DepositStatus.PENDING) {
			await queryRunner.manager.update(Tenant, tenantId, {
				depositStatus: DepositStatus.COLLECTED,
			});
		}
	}
}
