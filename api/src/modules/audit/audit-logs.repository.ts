import { AbstractRepository } from '@/database/abstract.repository';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

@Injectable()
export class AuditLogsRepository extends AbstractRepository<AuditLog> {
	constructor(
		@InjectRepository(AuditLog)
		private readonly auditLogRepository: Repository<AuditLog>,
	) {
		super(auditLogRepository);
	}

	createQueryBuilder(alias: string) {
		return this.auditLogRepository.createQueryBuilder(alias);
	}
}
