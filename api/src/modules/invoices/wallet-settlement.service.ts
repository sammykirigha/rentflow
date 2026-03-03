import { AuditAction } from '@/common/enums/audit-action.enum';
import { AuditTargetType } from '@/common/enums/audit-target-type.enum';
import { Tenant, TenantStatus } from '@/modules/tenants/entities/tenant.entity';
import { Receipt } from '@/modules/receipts/entities/receipt.entity';
import { Notification, NotificationType } from '@/modules/notifications/entities/notification.entity';
import { Inject, Injectable, Logger, OnModuleInit, forwardRef } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { DataSource, In } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { SettingsService } from '../settings/settings.service';
import { InvoicesService } from './invoices.service';
import { Invoice, InvoiceStatus, InvoiceType } from './entities/invoice.entity';
import { SettlementCoreService } from './settlement-core.service';

export interface SettlementSummary {
	tenantsProcessed: number;
	invoicesSettled: number;
	invoicesPartial: number;
}

@Injectable()
export class WalletSettlementService implements OnModuleInit {
	private readonly logger = new Logger(WalletSettlementService.name);
	// Single-process guard. If scaling to multiple processes, replace with
	// a Redis-based distributed lock or database advisory lock.
	private isRunning = false;
	private static readonly CRON_JOB_NAME = 'wallet-settlement';

	constructor(
		private readonly dataSource: DataSource,
		private readonly auditService: AuditService,
		private readonly invoicesService: InvoicesService,
		private readonly schedulerRegistry: SchedulerRegistry,
		private readonly settlementCoreService: SettlementCoreService,
		@Inject(forwardRef(() => SettingsService))
		private readonly settingsService: SettingsService,
	) {}

	async onModuleInit(): Promise<void> {
		try {
			const settings = await this.settingsService.getSettings();
			const minutes = settings.walletSettlementIntervalMinutes ?? 120;
			this.registerCronJob(minutes);
		} catch (error) {
			this.logger.error(`Failed to initialize wallet settlement cron, falling back to default (120 min): ${error.message}`);
			this.registerCronJob(120);
		}
	}

	/**
	 * Build a cron expression from an interval in minutes.
	 * - < 60 min: run every N minutes
	 * - >= 60 min: run every N hours at :30
	 */
	private buildCronExpression(minutes: number): string {
		if (minutes < 60) {
			return `*/${minutes} * * * *`;
		}
		const hours = Math.floor(minutes / 60);
		return `30 */${hours} * * *`;
	}

	private registerCronJob(minutes: number): void {
		try {
			this.schedulerRegistry.deleteCronJob(WalletSettlementService.CRON_JOB_NAME);
		} catch {
			// Job doesn't exist yet, that's fine
		}

		const cronExpression = this.buildCronExpression(minutes);
		const job = new CronJob(cronExpression, () => {
			this.handleScheduledSettlement();
		});

		this.schedulerRegistry.addCronJob(WalletSettlementService.CRON_JOB_NAME, job);
		job.start();

		this.logger.log(`Wallet settlement cron registered: "${cronExpression}" (every ${minutes} min)`);
	}

	/**
	 * Update the cron interval dynamically. Called when settings are changed.
	 */
	updateCronInterval(minutes: number): void {
		this.registerCronJob(minutes);
	}

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
			const systemUserId = await this.settlementCoreService.getSystemUserId();

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
				}
			}

			this.logger.log(
				`Wallet settlement complete. ` +
				`Tenants: ${summary.tenantsProcessed}, Settled: ${summary.invoicesSettled}, ` +
				`Partial: ${summary.invoicesPartial}`,
			);

			if (summary.invoicesSettled > 0 || summary.invoicesPartial > 0) {
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

		// Track original statuses for notification decisions
		const originalStatuses = new Map<string, InvoiceStatus>();

		try {
			// Lock tenant row with pessimistic_write
			const tenant = await queryRunner.manager
				.createQueryBuilder(Tenant, 'tenant')
				.setLock('pessimistic_write')
				.where('tenant.tenantId = :tenantId', { tenantId })
				.getOne();

			if (!tenant || parseFloat(String(tenant.walletBalance)) <= 0) {
				await queryRunner.rollbackTransaction();
				return { settled: 0, partial: 0 };
			}

			// Get unsettled rent invoices ordered by billing month ASC (oldest first)
			const unsettledInvoices = await queryRunner.manager.find(Invoice, {
				where: {
					tenantId,
					invoiceType: InvoiceType.RENT,
					status: In([InvoiceStatus.UNPAID, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE]),
				},
				order: { billingMonth: 'ASC' },
			});

			if (unsettledInvoices.length === 0) {
				await queryRunner.rollbackTransaction();
				return { settled: 0, partial: 0 };
			}

			// Record original statuses before settlement
			for (const inv of unsettledInvoices) {
				originalStatuses.set(inv.invoiceId, inv.status);
			}

			const result = await this.settlementCoreService.settleInvoicesFromWallet(
				queryRunner,
				tenant,
				unsettledInvoices,
				systemUserId,
			);

			// Update tenant wallet balance once
			await queryRunner.manager.update(Tenant, tenantId, {
				walletBalance: result.walletBalanceAfter,
			});

			await queryRunner.commitTransaction();

			// Write audit logs after commit (fire-and-forget)
			for (const log of result.pendingAuditLogs) {
				this.auditService.createLog(log).catch((err) =>
					this.logger.error(`Failed to write audit log: ${err.message}`),
				);
			}

			// Send notifications after commit — batch queries instead of N+1
			this.sendPostSettlementNotifications(
				result.invoiceResults,
				originalStatuses,
			).catch((err) =>
				this.logger.error(`Failed to send settlement notifications: ${err.message}`),
			);

			return { settled: result.settled, partial: result.partial };
		} catch (error) {
			await queryRunner.rollbackTransaction();
			throw error;
		} finally {
			await queryRunner.release();
		}
	}

	/**
	 * Send notifications for settled invoices. Uses batched queries (2 queries instead of N+1).
	 */
	private async sendPostSettlementNotifications(
		invoiceResults: Array<{ invoiceId: string; invoiceNumber: string; type: 'full' | 'partial' | 'skipped' }>,
		originalStatuses: Map<string, InvoiceStatus>,
	): Promise<void> {
		const settledIds = invoiceResults
			.filter((r) => r.type !== 'skipped')
			.map((r) => r.invoiceId);

		if (settledIds.length === 0) return;

		// Batch-load invoices with tenant relations
		const invoices = await this.dataSource.getRepository(Invoice).find({
			where: { invoiceId: In(settledIds) },
			relations: { tenant: { user: true } },
		});

		// Batch-load receipts for fully paid invoices
		const fullyPaidIds = invoiceResults
			.filter((r) => r.type === 'full')
			.map((r) => r.invoiceId);

		const receipts = fullyPaidIds.length > 0
			? await this.dataSource.getRepository(Receipt).find({
					where: { invoiceId: In(fullyPaidIds) },
				})
			: [];

		const receiptByInvoiceId = new Map(receipts.map((r) => [r.invoiceId, r]));
		const invoiceById = new Map(invoices.map((i) => [i.invoiceId, i]));

		for (const invResult of invoiceResults) {
			if (invResult.type === 'skipped') continue;

			const invoice = invoiceById.get(invResult.invoiceId);
			if (!invoice) continue;

			try {
				if (invResult.type === 'full') {
					const receipt = receiptByInvoiceId.get(invResult.invoiceId);
					if (receipt) {
						this.invoicesService.sendReceiptNotification(receipt.receiptId).catch((err) =>
							this.logger.error(`Failed to send receipt notification: ${err.message}`),
						);
					}
				} else if (invResult.type === 'partial') {
					const originalStatus = originalStatuses.get(invResult.invoiceId);
					if (originalStatus !== InvoiceStatus.PARTIALLY_PAID) {
						const shouldNotify = await this.shouldSendSettlementNotification(invResult.invoiceId);
						if (shouldNotify) {
							this.invoicesService.sendInvoiceNotification(invoice).catch((err) =>
								this.logger.error(`Failed to send settlement notification: ${err.message}`),
							);
						}
					}
				}
			} catch (err) {
				this.logger.error(`Failed to send notification for invoice ${invResult.invoiceId}: ${err.message}`);
			}
		}
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
}
