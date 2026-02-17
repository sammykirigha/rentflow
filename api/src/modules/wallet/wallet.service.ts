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
	): Promise<WalletTransaction> {
		const queryRunner = this.dataSource.createQueryRunner();
		await queryRunner.connect();
		await queryRunner.startTransaction();

		let txn: WalletTransaction;

		try {
			const tenant = await queryRunner.manager.findOne(Tenant, {
				where: { tenantId },
				lock: { mode: 'pessimistic_write' },
			});

			if (!tenant) {
				throw new NotFoundException('Tenant not found');
			}

			const balanceBefore = Number(tenant.walletBalance);
			const balanceAfter = balanceBefore + amount;

			txn = await queryRunner.manager.save(
				queryRunner.manager.create(WalletTransaction, {
					tenantId,
					type: WalletTxnType.CREDIT,
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
			performedBy: tenantId,
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
	): Promise<WalletTransaction> {
		const queryRunner = this.dataSource.createQueryRunner();
		await queryRunner.connect();
		await queryRunner.startTransaction();

		let txn: WalletTransaction;

		try {
			const tenant = await queryRunner.manager.findOne(Tenant, {
				where: { tenantId },
				lock: { mode: 'pessimistic_write' },
			});

			if (!tenant) {
				throw new NotFoundException('Tenant not found');
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
			performedBy: tenantId,
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

	async getBalance(tenantId: string): Promise<{ tenantId: string; walletBalance: number }> {
		const tenant = await this.getTenant(tenantId);

		return {
			tenantId: tenant.tenantId,
			walletBalance: Number(tenant.walletBalance),
		};
	}
}
