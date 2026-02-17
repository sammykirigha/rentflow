import { AuditAction } from '@/common/enums/audit-action.enum';
import { AuditTargetType } from '@/common/enums/audit-target-type.enum';
import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { ExpenseCategory, ExpenseStatus } from '../expenses/entities/expense.entity';
import { CreateMaintenanceRequestDto } from './dto/create-maintenance-request.dto';
import { UpdateMaintenanceRequestDto } from './dto/update-maintenance-request.dto';
import { MaintenanceRequest } from './entities/maintenance-request.entity';
import { MaintenanceRepository } from './maintenance.repository';

@Injectable()
export class MaintenanceService {
	constructor(
		private readonly maintenanceRepository: MaintenanceRepository,
		private readonly auditService: AuditService,
		private readonly dataSource: DataSource,
	) {}

	async create(dto: CreateMaintenanceRequestDto, userId: string): Promise<MaintenanceRequest> {
		const queryRunner = this.dataSource.createQueryRunner();
		await queryRunner.connect();
		await queryRunner.startTransaction();

		let maintenanceRequest: MaintenanceRequest;

		try {
			maintenanceRequest = await queryRunner.manager.save(
				queryRunner.manager.create(MaintenanceRequest, {
					tenantId: dto.tenantId,
					description: dto.description,
					category: dto.category,
					priority: dto.priority,
					photos: dto.photos,
				}),
			);
			await queryRunner.commitTransaction();
		} catch (err) {
			await queryRunner.rollbackTransaction();
			throw err;
		} finally {
			await queryRunner.release();
		}

		await this.auditService.createLog({
			action: AuditAction.MAINTENANCE_REQUESTED,
			performedBy: userId,
			targetType: AuditTargetType.MAINTENANCE,
			targetId: maintenanceRequest.maintenanceRequestId,
			details: `Maintenance request created for tenant ${dto.tenantId}: ${dto.description}`,
			metadata: {
				maintenanceRequestId: maintenanceRequest.maintenanceRequestId,
				tenantId: dto.tenantId,
				category: dto.category,
				priority: dto.priority,
			},
		});

		return this.maintenanceRepository.findOne({
			where: { maintenanceRequestId: maintenanceRequest.maintenanceRequestId },
			relations: { tenant: true },
		});
	}

	async findAll({
		page = 1,
		limit = 10,
		tenantId,
		status,
		category,
	}: {
		page: number;
		limit: number;
		tenantId?: string;
		status?: ExpenseStatus;
		category?: ExpenseCategory;
	}): Promise<{
		data: MaintenanceRequest[];
		pagination: {
			page: number;
			limit: number;
			total: number;
			totalPages: number;
		};
	}> {
		const skip = (page - 1) * limit;

		const queryBuilder = this.maintenanceRepository
			.createQueryBuilder('maintenance')
			.leftJoinAndSelect('maintenance.tenant', 'tenant')
			.leftJoinAndSelect('tenant.user', 'user')
			.orderBy('maintenance.createdAt', 'DESC')
			.skip(skip)
			.take(limit);

		if (tenantId) {
			queryBuilder.andWhere('maintenance.tenantId = :tenantId', { tenantId });
		}

		if (status) {
			queryBuilder.andWhere('maintenance.status = :status', { status });
		}

		if (category) {
			queryBuilder.andWhere('maintenance.category = :category', { category });
		}

		const [maintenanceRequests, total] = await queryBuilder.getManyAndCount();

		return {
			data: maintenanceRequests,
			pagination: {
				page,
				limit,
				total,
				totalPages: Math.ceil(total / limit),
			},
		};
	}

	async findOne(maintenanceRequestId: string): Promise<MaintenanceRequest> {
		const maintenanceRequest = await this.maintenanceRepository.findOne({
			where: { maintenanceRequestId },
			relations: { tenant: { user: true } },
		});

		if (!maintenanceRequest) {
			throw new NotFoundException('Maintenance request not found');
		}

		return maintenanceRequest;
	}

	async update(
		maintenanceRequestId: string,
		dto: UpdateMaintenanceRequestDto,
		userId: string,
	): Promise<MaintenanceRequest> {
		const maintenanceRequest = await this.findOne(maintenanceRequestId);

		const updateData: Partial<MaintenanceRequest> = {};

		if (dto.description !== undefined) updateData.description = dto.description;
		if (dto.category !== undefined) updateData.category = dto.category;
		if (dto.priority !== undefined) updateData.priority = dto.priority;
		if (dto.photos !== undefined) updateData.photos = dto.photos;
		if (dto.status !== undefined) updateData.status = dto.status;
		if (dto.resolvedAt !== undefined) updateData.resolvedAt = new Date(dto.resolvedAt);

		const queryRunner = this.dataSource.createQueryRunner();
		await queryRunner.connect();
		await queryRunner.startTransaction();

		try {
			await queryRunner.manager.update(MaintenanceRequest, { maintenanceRequestId }, updateData as any);
			await queryRunner.commitTransaction();
		} catch (err) {
			await queryRunner.rollbackTransaction();
			throw err;
		} finally {
			await queryRunner.release();
		}

		const isResolved = dto.status === ExpenseStatus.COMPLETED || dto.resolvedAt !== undefined;

		await this.auditService.createLog({
			action: isResolved ? AuditAction.MAINTENANCE_RESOLVED : AuditAction.MAINTENANCE_UPDATED,
			performedBy: userId,
			targetType: AuditTargetType.MAINTENANCE,
			targetId: maintenanceRequestId,
			details: isResolved
				? `Maintenance request ${maintenanceRequestId} resolved`
				: `Maintenance request ${maintenanceRequestId} updated`,
			metadata: {
				maintenanceRequestId,
				tenantId: maintenanceRequest.tenantId,
				updatedFields: Object.keys(updateData),
			},
		});

		return this.findOne(maintenanceRequestId);
	}
}
