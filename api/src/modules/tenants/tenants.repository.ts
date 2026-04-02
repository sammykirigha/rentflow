import { OrgScopedRepository } from '@/database/org-scoped.repository';
import { OrgContextService } from '@/common/services/org-context.service';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from './entities/tenant.entity';

@Injectable()
export class TenantsRepository extends OrgScopedRepository<Tenant> {
	constructor(
		@InjectRepository(Tenant)
		private readonly tenantRepository: Repository<Tenant>,
		orgContext: OrgContextService,
	) {
		super(tenantRepository, orgContext);
	}
}
