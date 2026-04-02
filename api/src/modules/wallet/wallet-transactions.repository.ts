import { OrgScopedRepository } from '@/database/org-scoped.repository';
import { OrgContextService } from '@/common/services/org-context.service';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WalletTransaction } from './entities/wallet-transaction.entity';

@Injectable()
export class WalletTransactionsRepository extends OrgScopedRepository<WalletTransaction> {
	constructor(
		@InjectRepository(WalletTransaction)
		private readonly walletTransactionRepository: Repository<WalletTransaction>,
		orgContext: OrgContextService,
	) {
		super(walletTransactionRepository, orgContext);
	}
}
