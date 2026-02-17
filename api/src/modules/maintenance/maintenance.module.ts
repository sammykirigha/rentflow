import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { MaintenanceRequest } from './entities/maintenance-request.entity';
import { MaintenanceController } from './maintenance.controller';
import { MaintenanceRepository } from './maintenance.repository';
import { MaintenanceService } from './maintenance.service';

@Module({
	imports: [
		TypeOrmModule.forFeature([MaintenanceRequest]),
		AuditModule,
	],
	controllers: [MaintenanceController],
	providers: [MaintenanceService, MaintenanceRepository],
	exports: [MaintenanceService, MaintenanceRepository],
})
export class MaintenanceModule {}
