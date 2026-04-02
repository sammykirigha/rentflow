import { OrgScopedRepository } from '@/database/org-scoped.repository';
import { OrgContextService } from '@/common/services/org-context.service';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MaintenanceRequest } from './entities/maintenance-request.entity';

@Injectable()
export class MaintenanceRepository extends OrgScopedRepository<MaintenanceRequest> {
	constructor(
		@InjectRepository(MaintenanceRequest)
		private readonly maintenanceRequestRepository: Repository<MaintenanceRequest>,
		orgContext: OrgContextService,
	) {
		super(maintenanceRequestRepository, orgContext);
	}
}
