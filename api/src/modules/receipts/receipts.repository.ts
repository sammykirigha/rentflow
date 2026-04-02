import { OrgScopedRepository } from '@/database/org-scoped.repository';
import { OrgContextService } from '@/common/services/org-context.service';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Receipt } from './entities/receipt.entity';

@Injectable()
export class ReceiptsRepository extends OrgScopedRepository<Receipt> {
	constructor(
		@InjectRepository(Receipt)
		private readonly receiptRepository: Repository<Receipt>,
		orgContext: OrgContextService,
	) {
		super(receiptRepository, orgContext);
	}
}
