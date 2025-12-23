import { Injectable } from '@nestjs/common';
import { AuditLogsRepository } from './audit-logs.repository';
import {
  AuditLogsListResponseDto,
  CreateAuditLogDto,
  GetAuditLogsQueryDto,
} from './dto/audit-log.dto';
import { AuditLog } from './entities/audit-log.entity';

@Injectable()
export class AuditService {
	constructor(private readonly auditLogsRepository: AuditLogsRepository) {}

	async createLog(dto: CreateAuditLogDto): Promise<AuditLog> {
		return await this.auditLogsRepository.create(dto);
	}

	async getLogs(query: GetAuditLogsQueryDto): Promise<AuditLogsListResponseDto> {
		const { page = 1, limit = 20, action, targetType, search } = query;
		const skip = (page - 1) * limit;

		const queryBuilder = this.auditLogsRepository
			.createQueryBuilder('audit')
			.leftJoinAndSelect('audit.performer', 'performer')
			.orderBy('audit.createdAt', 'DESC')
			.skip(skip)
			.take(limit);

		if (action) {
			queryBuilder.andWhere('audit.action = :action', { action });
		}

		if (targetType) {
			queryBuilder.andWhere('audit.targetType = :targetType', { targetType });
		}

		if (search) {
			queryBuilder.andWhere(
				'(audit.performerName ILIKE :search OR audit.details ILIKE :search OR audit.targetId ILIKE :search)',
				{ search: `%${search}%` },
			);
		}

		const [logs, total] = await queryBuilder.getManyAndCount();

		return {
			logs: logs.map((log) => ({
				auditId: log.auditId,
				action: log.action,
				performedBy: log.performedBy,
				performerName: log.performerName,
				targetType: log.targetType,
				targetId: log.targetId,
				details: log.details,
				ipAddress: log.ipAddress,
				metadata: log.metadata,
				createdAt: log.createdAt,
			})),
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		};
	}

	async getLogById(auditId: string): Promise<AuditLog> {
		return await this.auditLogsRepository.findOne({
			where: { auditId },
			relations: ['performer'],
		});
	}
}
