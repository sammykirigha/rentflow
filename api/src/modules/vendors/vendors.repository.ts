import { OrgScopedRepository } from '@/database/org-scoped.repository';
import { OrgContextService } from '@/common/services/org-context.service';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vendor } from './entities/vendor.entity';

@Injectable()
export class VendorsRepository extends OrgScopedRepository<Vendor> {
	constructor(
		@InjectRepository(Vendor)
		private readonly vendorRepository: Repository<Vendor>,
		orgContext: OrgContextService,
	) {
		super(vendorRepository, orgContext);
	}
}
