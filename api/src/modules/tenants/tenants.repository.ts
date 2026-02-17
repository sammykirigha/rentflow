import { AbstractRepository } from '@/database/abstract.repository';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from './entities/tenant.entity';

@Injectable()
export class TenantsRepository extends AbstractRepository<Tenant> {
	constructor(
		@InjectRepository(Tenant)
		private readonly tenantRepository: Repository<Tenant>,
	) {
		super(tenantRepository);
	}

	createQueryBuilder(alias: string) {
		return this.tenantRepository.createQueryBuilder(alias);
	}
}
