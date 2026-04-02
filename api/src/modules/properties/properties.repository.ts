import { OrgScopedRepository } from '@/database/org-scoped.repository';
import { OrgContextService } from '@/common/services/org-context.service';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Property } from './entities/property.entity';

@Injectable()
export class PropertiesRepository extends OrgScopedRepository<Property> {
	constructor(
		@InjectRepository(Property)
		private readonly propertyRepository: Repository<Property>,
		orgContext: OrgContextService,
	) {
		super(propertyRepository, orgContext);
	}
}
