import { AbstractRepository } from '@/database/abstract.repository';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MaintenanceRequest } from './entities/maintenance-request.entity';

@Injectable()
export class MaintenanceRepository extends AbstractRepository<MaintenanceRequest> {
	constructor(
		@InjectRepository(MaintenanceRequest)
		private readonly maintenanceRequestRepository: Repository<MaintenanceRequest>,
	) {
		super(maintenanceRequestRepository);
	}

	createQueryBuilder(alias: string) {
		return this.maintenanceRequestRepository.createQueryBuilder(alias);
	}
}
