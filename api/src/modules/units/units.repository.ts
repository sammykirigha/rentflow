import { OrgScopedRepository } from '@/database/org-scoped.repository';
import { OrgContextService } from '@/common/services/org-context.service';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Unit } from './entities/unit.entity';

@Injectable()
export class UnitsRepository extends OrgScopedRepository<Unit> {
	constructor(
		@InjectRepository(Unit)
		private readonly unitRepository: Repository<Unit>,
		orgContext: OrgContextService,
	) {
		super(unitRepository, orgContext);
	}
}
