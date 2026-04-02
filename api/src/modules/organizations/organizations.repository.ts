import { AbstractRepository } from '@/database/abstract.repository';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from './entities/organization.entity';

@Injectable()
export class OrganizationsRepository extends AbstractRepository<Organization> {
	constructor(
		@InjectRepository(Organization)
		private readonly organizationRepository: Repository<Organization>,
	) {
		super(organizationRepository);
	}

	createQueryBuilder(alias: string) {
		return this.organizationRepository.createQueryBuilder(alias);
	}
}
