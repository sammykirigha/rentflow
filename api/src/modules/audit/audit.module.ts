import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogsRepository } from './audit-logs.repository';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { AuditLog } from './entities/audit-log.entity';

@Module({
	imports: [TypeOrmModule.forFeature([AuditLog])],
	controllers: [AuditController],
	providers: [AuditService, AuditLogsRepository],
	exports: [AuditService],
})
export class AuditModule {}
