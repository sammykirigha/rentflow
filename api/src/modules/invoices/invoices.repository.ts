import { OrgScopedRepository } from '@/database/org-scoped.repository';
import { OrgContextService } from '@/common/services/org-context.service';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice } from './entities/invoice.entity';

@Injectable()
export class InvoicesRepository extends OrgScopedRepository<Invoice> {
	constructor(
		@InjectRepository(Invoice)
		private readonly invoiceRepository: Repository<Invoice>,
		orgContext: OrgContextService,
	) {
		super(invoiceRepository, orgContext);
	}
}
