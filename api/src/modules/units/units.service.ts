import { AuditAction } from '@/common/enums/audit-action.enum';
import { AuditTargetType } from '@/common/enums/audit-target-type.enum';
import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { BulkCreateUnitsDto } from './dto/bulk-create-units.dto';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { Unit } from './entities/unit.entity';
import { UnitsRepository } from './units.repository';

@Injectable()
export class UnitsService {
	constructor(
		private readonly unitsRepository: UnitsRepository,
		private readonly auditService: AuditService,
		private readonly dataSource: DataSource,
	) {}

	async create(createUnitDto: CreateUnitDto, userId: string): Promise<Unit> {
		const queryRunner = this.dataSource.createQueryRunner();
		await queryRunner.connect();
		await queryRunner.startTransaction();

		let unit: Unit;

		try {
			unit = await queryRunner.manager.save(
				queryRunner.manager.create(Unit, createUnitDto as any),
			);
			await queryRunner.commitTransaction();
		} catch (err) {
			await queryRunner.rollbackTransaction();
			throw err;
		} finally {
			await queryRunner.release();
		}

		await this.auditService.createLog({
			action: AuditAction.UNIT_CREATED,
			performedBy: userId,
			targetType: AuditTargetType.UNIT,
			targetId: unit.unitId,
			details: `Created unit "${unit.unitNumber}" for property ${unit.propertyId}`,
			metadata: {
				unitId: unit.unitId,
				unitNumber: unit.unitNumber,
				propertyId: unit.propertyId,
				rentAmount: unit.rentAmount,
			},
		});

		return unit;
	}

	async bulkCreate(bulkCreateUnitsDto: BulkCreateUnitsDto, userId: string): Promise<Unit[]> {
		const { propertyId, units } = bulkCreateUnitsDto;

		const queryRunner = this.dataSource.createQueryRunner();
		await queryRunner.connect();
		await queryRunner.startTransaction();

		let createdUnits: Unit[];

		try {
			createdUnits = await queryRunner.manager.save(
				units.map((unitItem) =>
					queryRunner.manager.create(Unit, {
						unitNumber: unitItem.unitNumber,
						rentAmount: unitItem.rentAmount,
						propertyId,
					} as any),
				),
			);
			await queryRunner.commitTransaction();
		} catch (err) {
			await queryRunner.rollbackTransaction();
			throw err;
		} finally {
			await queryRunner.release();
		}

		await this.auditService.createLog({
			action: AuditAction.UNIT_CREATED,
			performedBy: userId,
			targetType: AuditTargetType.UNIT,
			targetId: propertyId,
			details: `Bulk created ${createdUnits.length} units for property ${propertyId}`,
			metadata: {
				propertyId,
				unitCount: createdUnits.length,
				unitNumbers: createdUnits.map(u => u.unitNumber),
			},
		});

		return createdUnits;
	}

	async findByProperty(
		propertyId: string,
		{ page = 1, limit = 10 }: { page: number; limit: number },
	): Promise<{
		data: Unit[];
		pagination: {
			page: number;
			limit: number;
			total: number;
			totalPages: number;
		};
	}> {
		const skip = (page - 1) * limit;

		const [units, total] = await this.unitsRepository.findAndCount({
			where: { propertyId },
			skip,
			take: limit,
			order: { unitNumber: 'ASC' },
		});

		return {
			data: units,
			pagination: {
				page,
				limit,
				total,
				totalPages: Math.ceil(total / limit),
			},
		};
	}

	async findOne(unitId: string): Promise<Unit> {
		const unit = await this.unitsRepository.findOne({
			where: { unitId },
			relations: { property: true },
		});

		if (!unit) {
			throw new NotFoundException('Unit not found');
		}

		return unit;
	}

	async update(unitId: string, updateUnitDto: UpdateUnitDto, userId: string): Promise<Unit> {
		const unit = await this.findOne(unitId);

		const queryRunner = this.dataSource.createQueryRunner();
		await queryRunner.connect();
		await queryRunner.startTransaction();

		try {
			await queryRunner.manager.update(Unit, { unitId }, updateUnitDto as any);
			await queryRunner.commitTransaction();
		} catch (err) {
			await queryRunner.rollbackTransaction();
			throw err;
		} finally {
			await queryRunner.release();
		}

		await this.auditService.createLog({
			action: AuditAction.UNIT_UPDATED,
			performedBy: userId,
			targetType: AuditTargetType.UNIT,
			targetId: unitId,
			details: `Updated unit "${unit.unitNumber}" (${unitId})`,
			metadata: {
				unitId,
				unitNumber: unit.unitNumber,
				propertyId: unit.propertyId,
				updatedFields: Object.keys(updateUnitDto),
			},
		});

		return this.findOne(unitId);
	}

	async getVacantUnits(propertyId: string): Promise<Unit[]> {
		return this.unitsRepository.findAll({
			where: { propertyId, isOccupied: false },
			order: { unitNumber: 'ASC' },
		});
	}
}
