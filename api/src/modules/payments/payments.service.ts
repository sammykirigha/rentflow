import { AuditAction } from '@/common/enums/audit-action.enum';
import { AuditTargetType } from '@/common/enums/audit-target-type.enum';
import { Tenant, TenantStatus } from '@/modules/tenants/entities/tenant.entity';
import { BadRequestException, forwardRef, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { WalletService } from '../wallet/wallet.service';
import { WalletTxnType } from '../wallet/entities/wallet-transaction.entity';
import { WalletSettlementService } from '../invoices/wallet-settlement.service';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { ReconcilePaymentDto } from './dto/reconcile-payment.dto';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { PaymentsRepository } from './payments.repository';

@Injectable()
export class PaymentsService {
	private readonly logger = new Logger(PaymentsService.name);

	constructor(
		private readonly paymentsRepository: PaymentsRepository,
		@Inject(forwardRef(() => WalletSettlementService))
		private readonly walletSettlementService: WalletSettlementService,
		private readonly auditService: AuditService,
		private readonly walletService: WalletService,
		@InjectRepository(Tenant)
		private readonly tenantRepository: Repository<Tenant>,
	) {}

	async recordPayment(dto: RecordPaymentDto, userId: string): Promise<Payment> {
		// 1. Validate tenant exists and is active
		const tenant = await this.tenantRepository.findOne({
			where: { tenantId: dto.tenantId },
		});

		if (!tenant) {
			throw new NotFoundException('Tenant not found');
		}

		if (tenant.status !== TenantStatus.ACTIVE) {
			throw new BadRequestException('Tenant is not active');
		}

		// 2. Create payment record as PENDING
		const payment = await this.paymentsRepository.create({
			tenantId: dto.tenantId,
			amount: dto.amount,
			method: dto.method,
			status: PaymentStatus.PENDING,
			mpesaReceiptNumber: dto.mpesaReceiptNumber,
			mpesaPhoneNumber: dto.mpesaPhoneNumber,
			transactionDate: new Date(),
		});

		// 3. Credit tenant wallet
		await this.walletService.credit(
			dto.tenantId,
			dto.amount,
			dto.mpesaReceiptNumber || `payment-${payment.paymentId}`,
			`Payment received via ${dto.method}`,
			userId,
		);

		// 4. Update payment to COMPLETED
		await this.paymentsRepository.update({ paymentId: payment.paymentId }, {
			status: PaymentStatus.COMPLETED,
		});

		// 5. Audit log
		await this.auditService.createLog({
			action: AuditAction.PAYMENT_RECEIVED,
			performedBy: userId,
			targetType: AuditTargetType.PAYMENT,
			targetId: payment.paymentId,
			details: `Payment of ${dto.amount} received from tenant ${dto.tenantId} via ${dto.method}. Wallet credited.`,
			metadata: {
				paymentId: payment.paymentId,
				tenantId: dto.tenantId,
				amount: dto.amount,
				method: dto.method,
				mpesaReceiptNumber: dto.mpesaReceiptNumber,
			},
		});

		// 6. Trigger wallet settlement (awaited so API response reflects up-to-date invoice status)
		try {
			await this.walletSettlementService.settleTenantInvoices(dto.tenantId, userId);
		} catch (err) {
			this.logger.error(
				`Settlement failed after recording payment ${payment.paymentId} for tenant ${dto.tenantId}: ${err.message}`,
				err.stack,
			);
			// Settlement failure is non-fatal — the bi-hourly cron acts as safety net
		}

		// 7. Return payment with relations
		return this.paymentsRepository.findOne({
			where: { paymentId: payment.paymentId },
			relations: { tenant: true, invoice: true },
		});
	}

	async findAll({
		page = 1,
		limit = 10,
		tenantId,
		invoiceId,
	}: {
		page: number;
		limit: number;
		tenantId?: string;
		invoiceId?: string;
	}): Promise<{
		data: Payment[];
		pagination: {
			page: number;
			limit: number;
			total: number;
			totalPages: number;
		};
	}> {
		const skip = (page - 1) * limit;

		const queryBuilder = this.paymentsRepository
			.createQueryBuilder('payment')
			.leftJoinAndSelect('payment.tenant', 'tenant')
			.leftJoinAndSelect('tenant.user', 'user')
			.leftJoinAndSelect('payment.invoice', 'invoice')
			.orderBy('payment.createdAt', 'DESC')
			.skip(skip)
			.take(limit);

		if (tenantId) {
			queryBuilder.andWhere('payment.tenantId = :tenantId', { tenantId });
		}

		if (invoiceId) {
			queryBuilder.andWhere('payment.invoiceId = :invoiceId', { invoiceId });
		}

		const [payments, total] = await queryBuilder.getManyAndCount();

		return {
			data: payments,
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
		data: Payment[];
		pagination: {
			page: number;
			limit: number;
			total: number;
			totalPages: number;
		};
	}> {
		const skip = (page - 1) * limit;

		const queryBuilder = this.paymentsRepository
			.createQueryBuilder('payment')
			.leftJoinAndSelect('payment.tenant', 'tenant')
			.leftJoinAndSelect('payment.invoice', 'invoice')
			.where('payment.tenantId = :tenantId', { tenantId })
			.orderBy('payment.createdAt', 'DESC')
			.skip(skip)
			.take(limit);

		const [payments, total] = await queryBuilder.getManyAndCount();

		return {
			data: payments,
			pagination: {
				page,
				limit,
				total,
				totalPages: Math.ceil(total / limit),
			},
		};
	}

	async findUnreconciled({
		page = 1,
		limit = 10,
	}: {
		page: number;
		limit: number;
	}): Promise<{
		data: Payment[];
		pagination: {
			page: number;
			limit: number;
			total: number;
			totalPages: number;
		};
	}> {
		const skip = (page - 1) * limit;

		const queryBuilder = this.paymentsRepository
			.createQueryBuilder('payment')
			.leftJoinAndSelect('payment.tenant', 'tenant')
			.leftJoinAndSelect('tenant.user', 'user')
			.where('payment.needsReconciliation = :needsReconciliation', { needsReconciliation: true })
			.andWhere('payment.reconciledAt IS NULL')
			.orderBy('payment.createdAt', 'DESC')
			.skip(skip)
			.take(limit);

		const [payments, total] = await queryBuilder.getManyAndCount();

		return {
			data: payments,
			pagination: {
				page,
				limit,
				total,
				totalPages: Math.ceil(total / limit),
			},
		};
	}

	async reconcilePayment(
		paymentId: string,
		dto: ReconcilePaymentDto,
		userId: string,
	): Promise<Payment> {
		const payment = await this.paymentsRepository.findOne({
			where: { paymentId },
		});

		if (!payment) {
			throw new NotFoundException('Payment not found');
		}

		if (!payment.needsReconciliation) {
			throw new BadRequestException('Payment does not need reconciliation');
		}

		if (payment.reconciledAt) {
			throw new BadRequestException('Payment has already been reconciled');
		}

		if (payment.status !== PaymentStatus.COMPLETED) {
			throw new BadRequestException('Only completed payments can be reconciled');
		}

		// Verify target tenant exists and is active
		const targetTenant = await this.tenantRepository.findOne({
			where: { tenantId: dto.targetTenantId },
		});

		if (!targetTenant) {
			throw new NotFoundException('Target tenant not found');
		}

		if (targetTenant.status !== TenantStatus.ACTIVE) {
			throw new BadRequestException('Target tenant is not active');
		}

		// Credit the target tenant's wallet
		await this.walletService.credit(
			dto.targetTenantId,
			Number(payment.amount),
			payment.mpesaReceiptNumber || `reconciled-${paymentId}`,
			`Reconciled payment${dto.note ? `: ${dto.note}` : ''}`,
			userId,
			WalletTxnType.CREDIT_RECONCILIATION,
		);

		// Update the payment record
		await this.paymentsRepository.update({ paymentId }, {
			tenantId: dto.targetTenantId,
			needsReconciliation: false,
			reconciliationNote: dto.note,
			reconciledAt: new Date(),
			reconciledBy: userId,
		});

		// Audit log
		await this.auditService.createLog({
			action: AuditAction.PAYMENT_RECONCILED,
			performedBy: userId,
			targetType: AuditTargetType.PAYMENT,
			targetId: paymentId,
			details: `Reconciled payment ${paymentId} (KES ${payment.amount}) to tenant ${dto.targetTenantId}${dto.note ? `. Note: ${dto.note}` : ''}`,
			metadata: {
				paymentId,
				targetTenantId: dto.targetTenantId,
				amount: payment.amount,
				mpesaReceiptNumber: payment.mpesaReceiptNumber,
				note: dto.note,
			},
		});

		// Trigger wallet settlement for the target tenant
		try {
			await this.walletSettlementService.settleTenantInvoices(dto.targetTenantId, userId);
		} catch (err) {
			this.logger.error(
				`Settlement failed after reconciling payment ${paymentId} for tenant ${dto.targetTenantId}: ${err.message}`,
				err.stack,
			);
		}

		return this.paymentsRepository.findOne({
			where: { paymentId },
			relations: { tenant: true, invoice: true },
		});
	}
}
