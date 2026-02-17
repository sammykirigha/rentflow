import { AuditAction } from '@/common/enums/audit-action.enum';
import { AuditTargetType } from '@/common/enums/audit-target-type.enum';
import { Invoice, InvoiceStatus } from '@/modules/invoices/entities/invoice.entity';
import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { InvoicesService } from '../invoices/invoices.service';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { PaymentsRepository } from './payments.repository';

@Injectable()
export class PaymentsService {
	private readonly logger = new Logger(PaymentsService.name);

	constructor(
		private readonly paymentsRepository: PaymentsRepository,
		@Inject(forwardRef(() => InvoicesService))
		private readonly invoicesService: InvoicesService,
		private readonly auditService: AuditService,
		private readonly dataSource: DataSource,
	) {}

	async recordPayment(dto: RecordPaymentDto, userId: string): Promise<Payment> {
		const queryRunner = this.dataSource.createQueryRunner();
		await queryRunner.connect();
		await queryRunner.startTransaction();

		let payment: Payment;

		try {
			payment = await queryRunner.manager.save(
				queryRunner.manager.create(Payment, {
					tenantId: dto.tenantId,
					invoiceId: dto.invoiceId,
					amount: dto.amount,
					method: dto.method,
					status: PaymentStatus.COMPLETED,
					mpesaReceiptNumber: dto.mpesaReceiptNumber,
					mpesaPhoneNumber: dto.mpesaPhoneNumber,
					transactionDate: new Date(),
				}),
			);

			// If payment is linked to an invoice, update the invoice within the same transaction
			if (dto.invoiceId) {
				const invoice = await queryRunner.manager.findOne(Invoice, {
					where: { invoiceId: dto.invoiceId },
				});

				if (invoice) {
					const newAmountPaid = Number(invoice.amountPaid) + dto.amount;
					const newBalanceDue = Number(invoice.totalAmount) - newAmountPaid;

					let newStatus: InvoiceStatus;
					if (newBalanceDue <= 0) {
						newStatus = InvoiceStatus.PAID;
					} else if (newAmountPaid > 0) {
						newStatus = InvoiceStatus.PARTIALLY_PAID;
					} else {
						newStatus = invoice.status;
					}

					await queryRunner.manager.update(Invoice, dto.invoiceId, {
						amountPaid: newAmountPaid,
						balanceDue: Math.max(newBalanceDue, 0),
						status: newStatus,
						...(newStatus === InvoiceStatus.PAID ? { paidAt: new Date() } : {}),
					} as any);
				}
			}

			await queryRunner.commitTransaction();
		} catch (err) {
			await queryRunner.rollbackTransaction();
			this.logger.error(`Failed to record payment: ${err.message}`);
			throw err;
		} finally {
			await queryRunner.release();
		}

		await this.auditService.createLog({
			action: AuditAction.PAYMENT_RECEIVED,
			performedBy: userId,
			targetType: AuditTargetType.PAYMENT,
			targetId: payment.paymentId,
			details: `Payment of ${dto.amount} received from tenant ${dto.tenantId} via ${dto.method}`,
			metadata: {
				paymentId: payment.paymentId,
				tenantId: dto.tenantId,
				invoiceId: dto.invoiceId,
				amount: dto.amount,
				method: dto.method,
				mpesaReceiptNumber: dto.mpesaReceiptNumber,
			},
		});

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
}
