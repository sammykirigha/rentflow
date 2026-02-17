import { AbstractRepository } from '@/database/abstract.repository';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WalletTransaction } from './entities/wallet-transaction.entity';

@Injectable()
export class WalletTransactionsRepository extends AbstractRepository<WalletTransaction> {
	constructor(
		@InjectRepository(WalletTransaction)
		private readonly walletTransactionRepository: Repository<WalletTransaction>,
	) {
		super(walletTransactionRepository);
	}

	createQueryBuilder(alias: string) {
		return this.walletTransactionRepository.createQueryBuilder(alias);
	}
}
