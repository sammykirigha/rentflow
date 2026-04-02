import { AuditAction } from '@/common/enums/audit-action.enum';
import { AuditTargetType } from '@/common/enums/audit-target-type.enum';
import { orgAsyncStorage } from '@/common/services/org-async-context';
import { Tenant, TenantStatus } from '@/modules/tenants/entities/tenant.entity';
import { Receipt } from '@/modules/receipts/entities/receipt.entity';
import { Inject, Injectable, Logger, OnModuleInit, forwardRef } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DataSource, In } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { SettingsService } from '../settings/settings.service';
import { Invoice, InvoiceStatus, InvoiceType } from './entities/invoice.entity';
import { InvoicesRepository } from './invoices.repository';
import { InvoicesService } from './invoices.service';
import { SystemSetting } from '../settings/entities/system-setting.entity';
import { SettlementCoreService } from './settlement-core.service';

interface MonthlyInvoiceResult {
	generated: number;
	settled: number;
	partial: number;
	unpaid: number;
}

@Injectable()
export class InvoiceEngineService implements OnModuleInit {
	private readonly logger = new Logger(InvoiceEngineService.name);

	constructor(
		private readonly dataSource: DataSource,
		private readonly invoicesRepository: InvoicesRepository,
		private readonly auditService: AuditService,
		private readonly invoicesService: InvoicesService,
		private readonly settlementCoreService: SettlementCoreService,
		@Inject(forwardRef(() => SettingsService)) private readonly settingsService: SettingsService,
	) {}

	/**
	 * On startup, schedule a delayed catch-up check to ensure invoices
	 * are generated for the current month even if the primary cron was missed.
	 */
	async onModuleInit(): Promise<void> {
		setTimeout(() => {
			this.checkAndCatchUp().catch((err) =>
				this.logger.error(`Startup invoice catch-up failed: ${err.message}`, err.stack),
			);
		}, 15_000); // 15s delay to let DB connections stabilize
	}

	/**
	 * Periodic catch-up: every 4 hours, check if invoices need generating.
	 */
	@Cron('0 */4 * * *')
	async handleCatchUpCheck(): Promise<void> {
		await this.checkAndCatchUp();
	}

	/**
	 * Check if invoices have been generated for the current billing month.
	 * If not, trigger generation. Safe to call repeatedly (idempotent).
	 */
	private async checkAndCatchUp(): Promise<void> {
		const currentBillingMonth = this.normalizeBillingMonth();

		// Use raw repo to bypass org-scoping (cron has no auth context)
		const settingsRepo = this.dataSource.getRepository(SystemSetting);
		const anySettings = await settingsRepo.findOne({ where: {} });

		if (!anySettings) {
			this.logger.warn('No system settings found, skipping invoice catch-up');
			return;
		}

		const lastRun = anySettings.lastInvoiceGenerationMonth;
		if (lastRun && new Date(lastRun).getTime() >= currentBillingMonth.getTime()) {
			return; // Already generated for current month
		}

		this.logger.warn(
			`Invoice catch-up triggered. Last run: ${lastRun?.toISOString() ?? 'never'}, ` +
			`current billing month: ${currentBillingMonth.toISOString()}`,
		);

		await this.generateMonthlyInvoices();
	}

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

		const systemUserId = await this.settlementCoreService.getSystemUserId();

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
			// Wrap each tenant's processing in ALS context so that
			// OrgScopeSubscriber can auto-inject organizationId on entities
			// created via queryRunner.manager.create() inside the transaction.
			await orgAsyncStorage.run(
				{ organizationId: tenant.organizationId, isSuperAdmin: false, impersonatedBy: null },
				async () => {
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
							return;
						}

						const { status: settlementResult, invoice: settledInvoice, settledOlderInvoices } = await this.generateAndSettleInvoice(
							tenant,
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
								const receipt = await this.dataSource.getRepository(Receipt).findOne({
									where: { invoiceId: settledInvoice.invoiceId },
								});
								if (receipt) {
									this.invoicesService.sendReceiptNotification(receipt.receiptId).catch((err) =>
										this.logger.error(`Failed to send receipt notification for ${receipt.receiptNumber}: ${err.message}`),
									);
								}
							} else if (settlementResult === InvoiceStatus.PARTIALLY_PAID) {
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
								this.invoicesService.sendInvoiceNotification(settledInvoice).catch((err) =>
									this.logger.error(`Failed to send notification for invoice ${settledInvoice.invoiceNumber}: ${err.message}`),
								);
							}
						}

						// Send receipt notifications for older invoices that were also settled
						if (settledOlderInvoices.length > 0) {
							this.sendOlderInvoiceNotifications(settledOlderInvoices).catch((err) =>
								this.logger.error(`Failed to send notifications for older invoices: ${err.message}`),
							);
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
					}
				},
			);
		}

		this.logger.log(
			`Monthly invoice generation complete. ` +
			`Generated: ${result.generated}, Settled: ${result.settled}, ` +
			`Partial: ${result.partial}, Unpaid: ${result.unpaid}`,
		);

		// Update tracking flag on ALL settings rows (bypass org scope for cron context)
		try {
			await this.dataSource
				.getRepository(SystemSetting)
				.update({}, { lastInvoiceGenerationMonth: billing });
			this.logger.log(`Updated lastInvoiceGenerationMonth to ${billing.toISOString()}`);
		} catch (err) {
			this.logger.error(`Failed to update lastInvoiceGenerationMonth: ${err.message}`);
			// Non-fatal — next catch-up will retry generation (idempotent)
		}

		return result;
	}

	/**
	 * Generate a single invoice for a tenant and attempt auto-settlement.
	 * Uses a TypeORM transaction with pessimistic locking on wallet balance.
	 *
	 * @param tenant - Pre-loaded tenant with unit and user relations
	 */
	private async generateAndSettleInvoice(
		tenant: Tenant,
		billingMonth: Date,
		dueDate: Date,
		systemUserId?: string,
		recurringChargesTotal: number = 0,
		recurringChargesDesc: string = '',
	): Promise<{ status: InvoiceStatus; invoice: Invoice; settledOlderInvoices: Array<{ invoiceId: string; invoiceNumber: string; type: 'full' | 'partial' }> }> {
		const queryRunner = this.dataSource.createQueryRunner();
		await queryRunner.connect();
		await queryRunner.startTransaction();

		try {
			// 1. Lock the tenant row with pessimistic_write
			const lockedTenant = await queryRunner.manager
				.createQueryBuilder(Tenant, 'tenant')
				.setLock('pessimistic_write')
				.where('tenant.tenantId = :tenantId', { tenantId: tenant.tenantId })
				.getOne();

			if (!lockedTenant) {
				throw new Error(`Tenant with ID ${tenant.tenantId} not found`);
			}

			if (!tenant.unit) {
				throw new Error(`Tenant ${tenant.tenantId} has no assigned unit`);
			}

			const unitNumber = tenant.unit.unitNumber;
			const rentAmount = parseFloat(String(tenant.unit.rentAmount));
			const tenantName = tenant.user
				? `${tenant.user.firstName || ''} ${tenant.user.lastName || ''}`.trim()
				: tenant.tenantId;

			// 2. Generate invoice number
			const invoiceNumber = this.generateInvoiceNumber(unitNumber, billingMonth);

			// 3. Calculate invoice totals
			const waterCharge = 0;
			const electricityCharge = 0;
			const otherCharges = recurringChargesTotal;
			const subtotal = rentAmount + waterCharge + electricityCharge + otherCharges;
			const penaltyAmount = 0;
			const totalAmount = subtotal + penaltyAmount;

			// 4. Create the invoice entity
			const invoice = queryRunner.manager.create(Invoice, {
				invoiceNumber,
				invoiceType: InvoiceType.RENT,
				tenantId: tenant.tenantId,
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
				`(${tenant.tenantId}), total: KES ${totalAmount}`,
			);

			// 5. Audit: invoice generated (deferred)
			const pendingGenerationAudit = {
				action: AuditAction.INVOICE_GENERATED,
				performedBy: systemUserId,
				targetType: AuditTargetType.INVOICE,
				targetId: savedInvoice.invoiceId,
				details: `Auto-generated invoice ${invoiceNumber} for ${tenantName}, total: KES ${totalAmount}`,
				metadata: {
					invoiceId: savedInvoice.invoiceId,
					invoiceNumber,
					tenantId: tenant.tenantId,
					tenantName,
					rentAmount,
					totalAmount,
					billingMonth: billingMonth.toISOString(),
				},
			};

			// 6. Fetch ALL unsettled invoices for this tenant, ordered oldest first.
			const allUnsettledInvoices = await queryRunner.manager.find(Invoice, {
				where: {
					tenantId: tenant.tenantId,
					status: In([InvoiceStatus.UNPAID, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE]),
				},
				order: { billingMonth: 'ASC' },
			});

			// 7. Settle invoices from wallet using the core service
			const settlementResult = await this.settlementCoreService.settleInvoicesFromWallet(
				queryRunner,
				lockedTenant,
				allUnsettledInvoices,
				systemUserId,
			);

			// Update tenant wallet balance once after all settlements
			await queryRunner.manager.update(Tenant, tenant.tenantId, {
				walletBalance: settlementResult.walletBalanceAfter,
			});

			// Determine new invoice status from settlement results
			let newInvoiceStatus = InvoiceStatus.UNPAID;
			const settledOlderInvoices: Array<{ invoiceId: string; invoiceNumber: string; type: 'full' | 'partial' }> = [];

			for (const invResult of settlementResult.invoiceResults) {
				if (invResult.type === 'skipped') continue;

				if (invResult.invoiceId === savedInvoice.invoiceId) {
					newInvoiceStatus = invResult.type === 'full'
						? InvoiceStatus.PAID
						: InvoiceStatus.PARTIALLY_PAID;
				} else {
					settledOlderInvoices.push({
						invoiceId: invResult.invoiceId,
						invoiceNumber: invResult.invoiceNumber,
						type: invResult.type,
					});
				}
			}

			if (newInvoiceStatus === InvoiceStatus.UNPAID) {
				this.logger.log(
					`Invoice ${invoiceNumber} sent unpaid to ${tenantName} ` +
					`(wallet balance: KES ${settlementResult.walletBalanceAfter})`,
				);
			}

			await queryRunner.commitTransaction();

			// Write audit logs after commit (fire-and-forget)
			this.auditService.createLog(pendingGenerationAudit).catch((err) =>
				this.logger.error(`Failed to write audit log: ${err.message}`),
			);
			for (const log of settlementResult.pendingAuditLogs) {
				this.auditService.createLog(log).catch((err) =>
					this.logger.error(`Failed to write audit log: ${err.message}`),
				);
			}

			// Re-fetch invoice to get updated state after settlement
			const finalInvoice = await this.invoicesRepository.findOne({
				where: { invoiceId: savedInvoice.invoiceId },
			});

			return { status: newInvoiceStatus, invoice: finalInvoice || savedInvoice, settledOlderInvoices };
		} catch (error) {
			await queryRunner.rollbackTransaction();
			throw error;
		} finally {
			await queryRunner.release();
		}
	}

	/**
	 * Send notifications for older invoices that were settled during monthly generation.
	 * Uses batched queries.
	 */
	private async sendOlderInvoiceNotifications(
		settledOlderInvoices: Array<{ invoiceId: string; invoiceNumber: string; type: 'full' | 'partial' }>,
	): Promise<void> {
		const invoiceIds = settledOlderInvoices.map((i) => i.invoiceId);

		const invoices = await this.dataSource.getRepository(Invoice).find({
			where: { invoiceId: In(invoiceIds) },
			relations: { tenant: { user: true } },
		});

		const fullyPaidIds = settledOlderInvoices
			.filter((i) => i.type === 'full')
			.map((i) => i.invoiceId);

		const receipts = fullyPaidIds.length > 0
			? await this.dataSource.getRepository(Receipt).find({
					where: { invoiceId: In(fullyPaidIds) },
				})
			: [];

		const receiptByInvoiceId = new Map(receipts.map((r) => [r.invoiceId, r]));
		const invoiceById = new Map(invoices.map((i) => [i.invoiceId, i]));

		for (const older of settledOlderInvoices) {
			const invoice = invoiceById.get(older.invoiceId);
			if (!invoice) continue;

			try {
				if (older.type === 'full') {
					const receipt = receiptByInvoiceId.get(older.invoiceId);
					if (receipt) {
						this.invoicesService.sendReceiptNotification(receipt.receiptId).catch((err) =>
							this.logger.error(`Failed to send receipt notification for older invoice ${older.invoiceNumber}: ${err.message}`),
						);
					}
				} else if (older.type === 'partial') {
					this.invoicesService.sendInvoiceNotification(invoice).catch((err) =>
						this.logger.error(`Failed to send notification for older invoice ${older.invoiceNumber}: ${err.message}`),
					);
				}
			} catch (err) {
				this.logger.error(`Failed to send notification for older invoice ${older.invoiceId}: ${err.message}`);
			}
		}
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
	 * Normalize a billing month to the first day of that month at midnight UTC.
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
