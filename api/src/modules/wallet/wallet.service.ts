import { AuditAction } from '@/common/enums/audit-action.enum';
import { AuditTargetType } from '@/common/enums/audit-target-type.enum';
import { Tenant } from '@/modules/tenants/entities/tenant.entity';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { WalletTransaction, WalletTxnType } from './entities/wallet-transaction.entity';
import { WalletTransactionsRepository } from './wallet-transactions.repository';

@Injectable()
export class WalletService {
	private readonly logger = new Logger(WalletService.name);

	constructor(
		private readonly walletTransactionsRepository: WalletTransactionsRepository,
		private readonly auditService: AuditService,
		private readonly dataSource: DataSource,
		@InjectRepository(Tenant)
		private readonly tenantRepository: Repository<Tenant>,
	) {}

	private async getTenant(tenantId: string): Promise<Tenant> {
		const tenant = await this.tenantRepository.findOne({ where: { tenantId } });
		if (!tenant) {
			throw new NotFoundException('Tenant not found');
		}
		return tenant;
	}

	async findTenantByUserId(userId: string): Promise<Tenant> {
		const tenant = await this.tenantRepository.findOne({ where: { userId } });
		if (!tenant) {
			throw new NotFoundException('No tenant account found for this user');
		}
		return tenant;
	}

	async credit(
		tenantId: string,
		amount: number,
		reference?: string,
		description?: string,
		userId?: string,
		type: WalletTxnType = WalletTxnType.CREDIT,
	): Promise<WalletTransaction> {
		const queryRunner = this.dataSource.createQueryRunner();
		await queryRunner.connect();
		await queryRunner.startTransaction();

		let txn: WalletTransaction;
		let resolvedUserId = userId;

		try {
			const tenant = await queryRunner.manager
				.createQueryBuilder(Tenant, 'tenant')
				.setLock('pessimistic_write')
				.where('tenant.tenantId = :tenantId', { tenantId })
				.getOne();

			if (!tenant) {
				throw new NotFoundException('Tenant not found');
			}

			if (!resolvedUserId) {
				resolvedUserId = tenant.userId;
			}

			const balanceBefore = Number(tenant.walletBalance);
			const balanceAfter = balanceBefore + amount;

			txn = await queryRunner.manager.save(
				queryRunner.manager.create(WalletTransaction, {
					tenantId,
					type,
					amount,
					balanceBefore,
					balanceAfter,
					reference,
					description,
				}),
			);

			await queryRunner.manager.update(Tenant, tenantId, { walletBalance: balanceAfter } as any);

			await queryRunner.commitTransaction();
		} catch (err) {
			await queryRunner.rollbackTransaction();
			throw err;
		} finally {
			await queryRunner.release();
		}

		await this.auditService.createLog({
			action: AuditAction.WALLET_CREDITED,
			performedBy: resolvedUserId,
			targetType: AuditTargetType.WALLET,
			targetId: txn.walletTransactionId,
			details: `Wallet credited ${amount} for tenant ${tenantId}`,
			metadata: { tenantId, amount, reference },
		});

		return txn;
	}

	async debitForInvoice(
		tenantId: string,
		amount: number,
		reference?: string,
		description?: string,
		userId?: string,
	): Promise<WalletTransaction> {
		const queryRunner = this.dataSource.createQueryRunner();
		await queryRunner.connect();
		await queryRunner.startTransaction();

		let txn: WalletTransaction;
		let resolvedUserId = userId;

		try {
			const tenant = await queryRunner.manager
				.createQueryBuilder(Tenant, 'tenant')
				.setLock('pessimistic_write')
				.where('tenant.tenantId = :tenantId', { tenantId })
				.getOne();

			if (!tenant) {
				throw new NotFoundException('Tenant not found');
			}

			if (!resolvedUserId) {
				resolvedUserId = tenant.userId;
			}

			const balanceBefore = Number(tenant.walletBalance);
			const balanceAfter = balanceBefore - amount;

			txn = await queryRunner.manager.save(
				queryRunner.manager.create(WalletTransaction, {
					tenantId,
					type: WalletTxnType.DEBIT_INVOICE,
					amount,
					balanceBefore,
					balanceAfter,
					reference,
					description,
				}),
			);

			await queryRunner.manager.update(Tenant, tenantId, { walletBalance: balanceAfter } as any);

			await queryRunner.commitTransaction();
		} catch (err) {
			await queryRunner.rollbackTransaction();
			throw err;
		} finally {
			await queryRunner.release();
		}

		await this.auditService.createLog({
			action: AuditAction.WALLET_DEBITED,
			performedBy: resolvedUserId,
			targetType: AuditTargetType.WALLET,
			targetId: txn.walletTransactionId,
			details: `Wallet debited ${amount} for invoice for tenant ${tenantId}`,
			metadata: { tenantId, amount, reference },
		});

		return txn;
	}

	async getTransactions(
		tenantId: string,
		{ page = 1, limit = 10 }: { page: number; limit: number },
	): Promise<{
		data: WalletTransaction[];
		pagination: {
			page: number;
			limit: number;
			total: number;
			totalPages: number;
		};
	}> {
		const skip = (page - 1) * limit;

		const queryBuilder = this.walletTransactionsRepository
			.createQueryBuilder('txn')
			.where('txn.tenantId = :tenantId', { tenantId })
			.orderBy('txn.createdAt', 'DESC')
			.skip(skip)
			.take(limit);

		const [transactions, total] = await queryBuilder.getManyAndCount();

		return {
			data: transactions,
			pagination: {
				page,
				limit,
				total,
				totalPages: Math.ceil(total / limit),
			},
		};
	}

	async getLedger({
		page = 1,
		limit = 20,
		tenantId,
		type,
		startDate,
		endDate,
	}: {
		page?: number;
		limit?: number;
		tenantId?: string;
		type?: WalletTxnType;
		startDate?: string;
		endDate?: string;
	}) {
		const skip = (page - 1) * limit;

		const qb = this.walletTransactionsRepository
			.createQueryBuilder('txn')
			.leftJoinAndSelect('txn.tenant', 'tenant')
			.leftJoinAndSelect('tenant.user', 'user')
			.leftJoinAndSelect('tenant.unit', 'unit')
			.leftJoinAndSelect('unit.property', 'property')
			.orderBy('txn.createdAt', 'DESC')
			.skip(skip)
			.take(limit);

		if (tenantId) {
			qb.andWhere('txn.tenantId = :tenantId', { tenantId });
		}
		if (type) {
			qb.andWhere('txn.type = :type', { type });
		}
		if (startDate) {
			qb.andWhere('txn.createdAt >= :startDate', { startDate });
		}
		if (endDate) {
			qb.andWhere('txn.createdAt <= :endDate', { endDate: `${endDate}T23:59:59.999Z` });
		}

		const [transactions, total] = await qb.getManyAndCount();

		return {
			data: transactions,
			pagination: {
				page,
				limit,
				total,
				totalPages: Math.ceil(total / limit),
			},
		};
	}

	async getStatementData(
		tenantId: string,
		{ startDate, endDate }: { startDate?: string; endDate?: string },
	) {
		const tenant = await this.tenantRepository.findOne({
			where: { tenantId },
			relations: ['user', 'unit', 'unit.property'],
		});
		if (!tenant) {
			throw new NotFoundException('Tenant not found');
		}

		const qb = this.walletTransactionsRepository
			.createQueryBuilder('txn')
			.where('txn.tenantId = :tenantId', { tenantId })
			.orderBy('txn.createdAt', 'ASC');

		if (startDate) {
			qb.andWhere('txn.createdAt >= :startDate', { startDate });
		}
		if (endDate) {
			qb.andWhere('txn.createdAt <= :endDate', { endDate: `${endDate}T23:59:59.999Z` });
		}

		const transactions = await qb.getMany();

		let openingBalance = 0;
		if (startDate && transactions.length > 0) {
			openingBalance = Number(transactions[0].balanceBefore);
		} else if (transactions.length > 0) {
			openingBalance = Number(transactions[0].balanceBefore);
		}

		const closingBalance =
			transactions.length > 0
				? Number(transactions[transactions.length - 1].balanceAfter)
				: Number(tenant.walletBalance);

		let totalCredits = 0;
		let totalDebits = 0;
		for (const txn of transactions) {
			const amount = Number(txn.amount);
			if (txn.type === WalletTxnType.CREDIT || txn.type === WalletTxnType.CREDIT_RECONCILIATION || txn.type === WalletTxnType.REFUND) {
				totalCredits += amount;
			} else {
				totalDebits += amount;
			}
		}

		// Reverse so most recent transactions appear first in the PDF
		transactions.reverse();

		return {
			tenant,
			transactions,
			openingBalance,
			closingBalance,
			totalCredits,
			totalDebits,
		};
	}

	async getBalance(tenantId: string): Promise<{ tenantId: string; walletBalance: number }> {
		const tenant = await this.getTenant(tenantId);

		return {
			tenantId: tenant.tenantId,
			walletBalance: Number(tenant.walletBalance),
		};
	}
}
