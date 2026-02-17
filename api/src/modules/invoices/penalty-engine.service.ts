import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DataSource, In, LessThan, IsNull, Or } from 'typeorm';
import { InvoicesRepository } from './invoices.repository';
import { Invoice, InvoiceStatus } from './entities/invoice.entity';
import { AuditService } from '@/modules/audit/audit.service';
import { AuditAction } from '@/common/enums/audit-action.enum';
import { AuditTargetType } from '@/common/enums/audit-target-type.enum';

@Injectable()
export class PenaltyEngineService {
	private readonly logger = new Logger(PenaltyEngineService.name);
	private readonly PENALTY_RATE = 0.05; // 5% — configurable via SystemConfig later

	constructor(
		private readonly dataSource: DataSource,
		private readonly invoicesRepository: InvoicesRepository,
		private readonly auditService: AuditService,
	) {}

	/**
	 * Cron job: runs daily at 1:00 AM to apply penalties to overdue invoices.
	 */
	@Cron('0 1 * * *')
	async handleDailyPenalties(): Promise<void> {
		this.logger.log('Cron triggered: daily penalty check');
		await this.applyPenalties();
	}

	/**
	 * Apply penalties to all overdue invoices.
	 * Runs daily via cron, or manually.
	 *
	 * Finds invoices that are UNPAID or PARTIALLY_PAID with a dueDate in the past
	 * and either have never had a penalty applied, or had one applied more than
	 * 30 days ago (monthly recurring penalty).
	 */
	async applyPenalties(): Promise<{ penalized: number; totalPenalty: number }> {
		const now = new Date();
		const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

		// Find all overdue invoices eligible for a penalty
		const overdueInvoices = await this.invoicesRepository.findAll({
			where: {
				status: In([InvoiceStatus.UNPAID, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE]),
				dueDate: LessThan(now),
				penaltyAppliedAt: Or(IsNull(), LessThan(thirtyDaysAgo)),
			},
		});

		this.logger.log(`Found ${overdueInvoices.length} overdue invoice(s) eligible for penalty`);

		let penalized = 0;
		let totalPenalty = 0;

		for (const invoice of overdueInvoices) {
			try {
				const penaltyAmount = await this.applyPenaltyToInvoice(invoice, now);
				penalized++;
				totalPenalty += penaltyAmount;
			} catch (error) {
				this.logger.error(
					`Failed to apply penalty to invoice ${invoice.invoiceNumber}: ${error.message}`,
					error.stack,
				);
			}
		}

		this.logger.log(
			`Penalty run complete: ${penalized} invoice(s) penalized, total penalty KES ${totalPenalty.toFixed(2)}`,
		);

		return { penalized, totalPenalty };
	}

	/**
	 * Apply a penalty to a single invoice inside a transaction.
	 * Returns the penalty amount that was applied.
	 */
	private async applyPenaltyToInvoice(invoice: Invoice, now: Date): Promise<number> {
		const queryRunner = this.dataSource.createQueryRunner();
		await queryRunner.connect();
		await queryRunner.startTransaction();

		try {
			// Re-fetch within the transaction with a pessimistic lock to prevent
			// concurrent penalty application on the same invoice.
			const locked = await queryRunner.manager.findOne(Invoice, {
				where: { invoiceId: invoice.invoiceId },
				lock: { mode: 'pessimistic_write' },
			});

			if (!locked) {
				throw new Error(`Invoice ${invoice.invoiceId} not found during lock`);
			}

			// Double-check eligibility after acquiring the lock
			if (
				locked.balanceDue <= 0 ||
				locked.status === InvoiceStatus.PAID ||
				locked.status === InvoiceStatus.CANCELLED
			) {
				await queryRunner.rollbackTransaction();
				return 0;
			}

			const balanceDue = Number(locked.balanceDue);
			const penalty = Math.round(balanceDue * this.PENALTY_RATE * 100) / 100;

			const updatedPenaltyAmount = Number(locked.penaltyAmount) + penalty;
			const updatedTotalAmount = Number(locked.totalAmount) + penalty;
			const updatedBalanceDue = Number(locked.balanceDue) + penalty;

			await queryRunner.manager.update(Invoice, locked.invoiceId, {
				penaltyAmount: updatedPenaltyAmount,
				totalAmount: updatedTotalAmount,
				balanceDue: updatedBalanceDue,
				status: InvoiceStatus.OVERDUE,
				penaltyAppliedAt: now,
			});

			await queryRunner.commitTransaction();

			this.logger.log(
				`Penalty applied to ${locked.invoiceNumber}: KES ${penalty.toFixed(2)} ` +
				`(balance was KES ${balanceDue.toFixed(2)}, now KES ${updatedBalanceDue.toFixed(2)})`,
			);

			// Audit log (outside the critical transaction — best-effort)
			await this.auditService.createLog({
				action: AuditAction.PENALTY_APPLIED,
				performedBy: 'system',
				performerName: 'Penalty Engine',
				targetType: AuditTargetType.INVOICE,
				targetId: locked.invoiceId,
				details: `Penalty of KES ${penalty.toFixed(2)} applied to invoice ${locked.invoiceNumber}. ` +
					`Outstanding balance: KES ${updatedBalanceDue.toFixed(2)}`,
				metadata: {
					invoiceNumber: locked.invoiceNumber,
					tenantId: locked.tenantId,
					penaltyRate: this.PENALTY_RATE,
					penaltyAmount: penalty,
					previousBalanceDue: balanceDue,
					newBalanceDue: updatedBalanceDue,
				},
			});

			return penalty;
		} catch (error) {
			await queryRunner.rollbackTransaction();
			throw error;
		} finally {
			await queryRunner.release();
		}
	}
}
