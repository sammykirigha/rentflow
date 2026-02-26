import { AuditAction } from '@/common/enums/audit-action.enum';
import { AuditTargetType } from '@/common/enums/audit-target-type.enum';
import { UserRole } from '@/common/enums/user-role.enum';
import { Payment, PaymentMethod, PaymentStatus } from '@/modules/payments/entities/payment.entity';
import { Tenant, TenantStatus, DepositStatus } from '@/modules/tenants/entities/tenant.entity';
import { Receipt } from '@/modules/receipts/entities/receipt.entity';
import { User } from '@/modules/users/entities/user.entity';
import { Role } from '@/modules/permissions/entities/role.entity';
import { WalletTransaction, WalletTxnType } from '@/modules/wallet/entities/wallet-transaction.entity';
import { Notification, NotificationChannel, NotificationStatus, NotificationType } from '@/modules/notifications/entities/notification.entity';
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DataSource, In } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { InvoicesService } from './invoices.service';
import { Invoice, InvoiceStatus } from './entities/invoice.entity';

export interface SettlementSummary {
	tenantsProcessed: number;
	invoicesSettled: number;
	invoicesPartial: number;
}

@Injectable()
export class WalletSettlementService {
	private readonly logger = new Logger(WalletSettlementService.name);
	private isRunning = false;

	constructor(
		private readonly dataSource: DataSource,
		private readonly auditService: AuditService,
		private readonly invoicesService: InvoicesService,
	) {}

	/**
	 * Cron job: runs at :30 past every 2nd hour to settle pending invoices from wallet balances.
	 * Offset by 30 minutes to avoid overlap with the monthly invoice generation cron (0 0 1 * *).
	 */
	@Cron('30 */2 * * *')
	async handleScheduledSettlement(): Promise<void> {
		this.logger.log('Cron triggered: wallet auto-settlement');
		await this.settlePendingInvoices();
	}

	/**
	 * Main settlement method. Can be called by cron or manually via API.
	 */
	async settlePendingInvoices(): Promise<SettlementSummary> {
		if (this.isRunning) {
			this.logger.warn('Settlement cycle already in progress, skipping');
			return { tenantsProcessed: 0, invoicesSettled: 0, invoicesPartial: 0 };
		}

		this.isRunning = true;
		const summary: SettlementSummary = {
			tenantsProcessed: 0,
			invoicesSettled: 0,
			invoicesPartial: 0,
		};

		try {
			// Find the system user for audit logging
			const systemUserId = await this.getSystemUserId();

			// Single optimized query: find tenants with walletBalance > 0 AND at least one unsettled invoice
			const eligibleTenants = await this.dataSource
				.getRepository(Tenant)
				.createQueryBuilder('tenant')
				.innerJoin(
					'invoices',
					'invoice',
					'invoice.tenant_id = tenant.tenant_id AND invoice.status IN (:...statuses)',
					{ statuses: [InvoiceStatus.UNPAID, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE] },
				)
				.where('tenant.wallet_balance > 0')
				.andWhere('tenant.status = :activeStatus', { activeStatus: TenantStatus.ACTIVE })
				.select(['tenant.tenant_id'])
				.distinct(true)
				.getRawMany();

			const tenantIds: string[] = eligibleTenants.map((t) => t.tenant_tenant_id);

			if (tenantIds.length === 0) {
				this.logger.log('No eligible tenants found for wallet settlement');
				return summary;
			}

			this.logger.log(`Found ${tenantIds.length} eligible tenant(s) for wallet settlement`);

			// Process each tenant in its own transaction
			for (const tenantId of tenantIds) {
				try {
					const result = await this.settleTenantInvoices(tenantId, systemUserId);
					summary.tenantsProcessed++;
					summary.invoicesSettled += result.settled;
					summary.invoicesPartial += result.partial;
				} catch (error) {
					this.logger.error(
						`Failed to settle invoices for tenant ${tenantId}: ${error.message}`,
						error.stack,
					);
					// Continue processing other tenants
				}
			}

			this.logger.log(
				`Wallet settlement complete. ` +
				`Tenants: ${summary.tenantsProcessed}, Settled: ${summary.invoicesSettled}, ` +
				`Partial: ${summary.invoicesPartial}`,
			);

			// Audit the settlement run
			if (systemUserId && (summary.invoicesSettled > 0 || summary.invoicesPartial > 0)) {
				await this.auditService.createLog({
					action: AuditAction.WALLET_AUTO_SETTLEMENT_COMPLETED,
					performedBy: systemUserId,
					targetType: AuditTargetType.WALLET,
					targetId: 'system',
					details: `Wallet auto-settlement completed. Tenants: ${summary.tenantsProcessed}, Settled: ${summary.invoicesSettled}, Partial: ${summary.invoicesPartial}`,
					metadata: summary,
				});
			}

			return summary;
		} finally {
			this.isRunning = false;
		}
	}

	/**
	 * Settle all outstanding invoices for a single tenant within a transaction.
	 */
	async settleTenantInvoices(
		tenantId: string,
		systemUserId?: string,
	): Promise<{ settled: number; partial: number }> {
		const queryRunner = this.dataSource.createQueryRunner();
		await queryRunner.connect();
		await queryRunner.startTransaction();

		const result = { settled: 0, partial: 0 };

		try {
			// Lock tenant row with pessimistic_write
			const tenant = await queryRunner.manager
				.createQueryBuilder(Tenant, 'tenant')
				.setLock('pessimistic_write')
				.where('tenant.tenantId = :tenantId', { tenantId })
				.getOne();

			if (!tenant) {
				await queryRunner.rollbackTransaction();
				return result;
			}

			let walletBalance = parseFloat(String(tenant.walletBalance));
			if (walletBalance <= 0) {
				await queryRunner.rollbackTransaction();
				return result;
			}

			// Load tenant relations for notification purposes
			const tenantWithRelations = await queryRunner.manager.findOne(Tenant, {
				where: { tenantId },
				relations: { unit: true, user: true },
			});

			const tenantName = tenantWithRelations?.user
				? `${tenantWithRelations.user.firstName || ''} ${tenantWithRelations.user.lastName || ''}`.trim()
				: tenantId;

			// Get unsettled invoices ordered by billing month ASC (oldest first)
			const unsettledInvoices = await queryRunner.manager.find(Invoice, {
				where: {
					tenantId,
					status: In([InvoiceStatus.UNPAID, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE]),
				},
				order: { billingMonth: 'ASC' },
			});

			if (unsettledInvoices.length === 0) {
				await queryRunner.rollbackTransaction();
				return result;
			}

			for (const invoice of unsettledInvoices) {
				if (walletBalance <= 0) break;

				const balanceDue = parseFloat(String(invoice.balanceDue));
				if (balanceDue <= 0) continue;

				if (walletBalance >= balanceDue) {
					// Full settlement
					const newBalance = parseFloat((walletBalance - balanceDue).toFixed(2));

					// Wallet transaction
					await queryRunner.manager.save(
						queryRunner.manager.create(WalletTransaction, {
							tenantId,
							type: WalletTxnType.DEBIT_INVOICE,
							amount: balanceDue,
							balanceBefore: walletBalance,
							balanceAfter: newBalance,
							reference: invoice.invoiceNumber,
							description: `Auto-settlement for invoice ${invoice.invoiceNumber}`,
						}),
					);

					// Payment record
					await queryRunner.manager.save(
						queryRunner.manager.create(Payment, {
							tenantId,
							invoiceId: invoice.invoiceId,
							amount: balanceDue,
							method: PaymentMethod.WALLET_DEDUCTION,
							status: PaymentStatus.COMPLETED,
							transactionDate: new Date(),
						}),
					);

					// Update invoice
					const newAmountPaid = parseFloat(String(invoice.amountPaid)) + balanceDue;
					await queryRunner.manager.update(Invoice, invoice.invoiceId, {
						amountPaid: newAmountPaid,
						balanceDue: 0,
						status: InvoiceStatus.PAID,
						paidAt: new Date(),
					});

					// Receipt: check for existing one (idempotency)
					const existingReceipt = await queryRunner.manager.findOne(Receipt, {
						where: { invoiceId: invoice.invoiceId },
					});

					if (existingReceipt) {
						await queryRunner.manager.update(Receipt, existingReceipt.receiptId, {
							totalPaid: Number(invoice.totalAmount),
						});
					} else {
						const receiptNumber = invoice.invoiceNumber.replace(/^INV-/, 'RCP-');
						await queryRunner.manager.save(
							queryRunner.manager.create(Receipt, {
								receiptNumber,
								invoiceId: invoice.invoiceId,
								totalPaid: Number(invoice.totalAmount),
							}),
						);
					}

					// Update deposit status to COLLECTED if this invoice contains a security deposit
					if (invoice.otherChargesDesc?.includes('Security Deposit')) {
						const currentTenant = await queryRunner.manager.findOne(Tenant, { where: { tenantId } });
						if (currentTenant && currentTenant.depositStatus === DepositStatus.PENDING) {
							await queryRunner.manager.update(Tenant, tenantId, {
								depositStatus: DepositStatus.COLLECTED,
							});
						}
					}

					walletBalance = newBalance;
					result.settled++;

					this.logger.log(
						`Auto-settled invoice ${invoice.invoiceNumber} for ${tenantName}. ` +
						`Deducted KES ${balanceDue}. New wallet balance: KES ${newBalance}`,
					);

					// Audit
					await this.auditService.createLog({
						action: AuditAction.INVOICE_AUTO_SETTLED,
						performedBy: systemUserId,
						targetType: AuditTargetType.INVOICE,
						targetId: invoice.invoiceId,
						details: `Wallet auto-settlement: invoice ${invoice.invoiceNumber} fully paid (KES ${balanceDue}) for ${tenantName}`,
						metadata: {
							invoiceId: invoice.invoiceId,
							invoiceNumber: invoice.invoiceNumber,
							tenantId,
							amount: balanceDue,
							walletBalanceBefore: walletBalance + balanceDue,
							walletBalanceAfter: newBalance,
						},
					});
				} else {
					// Partial settlement
					const newBalance = 0;
					const amountToDeduct = walletBalance;
					const newAmountPaid = parseFloat(String(invoice.amountPaid)) + amountToDeduct;
					const newBalanceDue = parseFloat((balanceDue - amountToDeduct).toFixed(2));

					// Wallet transaction
					await queryRunner.manager.save(
						queryRunner.manager.create(WalletTransaction, {
							tenantId,
							type: WalletTxnType.DEBIT_INVOICE,
							amount: amountToDeduct,
							balanceBefore: walletBalance,
							balanceAfter: newBalance,
							reference: invoice.invoiceNumber,
							description: `Partial auto-settlement for invoice ${invoice.invoiceNumber}`,
						}),
					);

					// Payment record
					await queryRunner.manager.save(
						queryRunner.manager.create(Payment, {
							tenantId,
							invoiceId: invoice.invoiceId,
							amount: amountToDeduct,
							method: PaymentMethod.WALLET_DEDUCTION,
							status: PaymentStatus.COMPLETED,
							transactionDate: new Date(),
						}),
					);

					// Update invoice
					await queryRunner.manager.update(Invoice, invoice.invoiceId, {
						amountPaid: newAmountPaid,
						balanceDue: newBalanceDue,
						status: InvoiceStatus.PARTIALLY_PAID,
					});

					// Receipt: check for existing one (idempotency)
					const existingReceipt = await queryRunner.manager.findOne(Receipt, {
						where: { invoiceId: invoice.invoiceId },
					});

					if (existingReceipt) {
						await queryRunner.manager.update(Receipt, existingReceipt.receiptId, {
							totalPaid: newAmountPaid,
						});
					} else {
						const receiptNumber = invoice.invoiceNumber.replace(/^INV-/, 'RCP-');
						await queryRunner.manager.save(
							queryRunner.manager.create(Receipt, {
								receiptNumber,
								invoiceId: invoice.invoiceId,
								totalPaid: newAmountPaid,
							}),
						);
					}

					walletBalance = newBalance;
					result.partial++;

					this.logger.log(
						`Partial settlement for invoice ${invoice.invoiceNumber} for ${tenantName}. ` +
						`Deducted KES ${amountToDeduct}. Remaining: KES ${newBalanceDue}`,
					);

					// Audit
					await this.auditService.createLog({
						action: AuditAction.INVOICE_PARTIALLY_SETTLED,
						performedBy: systemUserId,
						targetType: AuditTargetType.INVOICE,
						targetId: invoice.invoiceId,
						details: `Wallet auto-settlement: partial payment of KES ${amountToDeduct} for invoice ${invoice.invoiceNumber}. Remaining: KES ${newBalanceDue}`,
						metadata: {
							invoiceId: invoice.invoiceId,
							invoiceNumber: invoice.invoiceNumber,
							tenantId,
							amountPaid: amountToDeduct,
							balanceDue: newBalanceDue,
						},
					});

					break; // Wallet exhausted
				}
			}

			// Update tenant wallet balance
			await queryRunner.manager.update(Tenant, tenantId, {
				walletBalance,
			});

			await queryRunner.commitTransaction();

			// Send notifications after commit (fire-and-forget)
			// Only notify for fully paid invoices, or partials if no notification in last 24 hours
			for (const invoice of unsettledInvoices) {
				try {
					const updatedInvoice = await this.dataSource.getRepository(Invoice).findOne({
						where: { invoiceId: invoice.invoiceId },
						relations: { tenant: { user: true } },
					});
					if (!updatedInvoice) continue;

					if (updatedInvoice.status === InvoiceStatus.PAID) {
						// Always notify on full payment
						const receipt = await this.dataSource.getRepository(Receipt).findOne({
							where: { invoiceId: invoice.invoiceId },
						});
						if (receipt) {
							this.invoicesService.sendReceiptNotification(receipt.receiptId).catch((err) =>
								this.logger.error(`Failed to send receipt notification: ${err.message}`),
							);
						}
					} else if (updatedInvoice.status === InvoiceStatus.PARTIALLY_PAID && updatedInvoice.status !== invoice.status) {
						// Partial settlement changed status — check cooldown
						const shouldNotify = await this.shouldSendSettlementNotification(invoice.invoiceId);
						if (shouldNotify) {
							this.invoicesService.sendInvoiceNotification(updatedInvoice).catch((err) =>
								this.logger.error(`Failed to send settlement notification: ${err.message}`),
							);
						}
					}
				} catch (err) {
					this.logger.error(`Failed to send notification for invoice ${invoice.invoiceId}: ${err.message}`);
				}
			}
		} catch (error) {
			await queryRunner.rollbackTransaction();
			throw error;
		} finally {
			await queryRunner.release();
		}

		return result;
	}

	/**
	 * Check if a settlement notification was sent for this invoice in the last 24 hours.
	 * Returns true if we should send a notification (no recent notification found).
	 */
	private async shouldSendSettlementNotification(invoiceId: string): Promise<boolean> {
		const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

		const recentNotification = await this.dataSource
			.getRepository(Notification)
			.createQueryBuilder('notification')
			.where('notification.invoiceId = :invoiceId', { invoiceId })
			.andWhere('notification.type IN (:...types)', {
				types: [NotificationType.INVOICE_SENT, NotificationType.RECEIPT_SENT],
			})
			.andWhere('notification.sentAt > :since', { since: twentyFourHoursAgo })
			.getOne();

		return !recentNotification;
	}

	/**
	 * Find the landlord user ID for audit logging.
	 */
	private async getSystemUserId(): Promise<string | undefined> {
		const landlordRole = await this.dataSource.getRepository(Role).findOne({
			where: { name: UserRole.LANDLORD },
		});

		if (!landlordRole) return undefined;

		const landlordUser = await this.dataSource.getRepository(User).findOne({
			where: { roleId: landlordRole.roleId },
		});

		return landlordUser?.userId;
	}
}
