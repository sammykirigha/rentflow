import { AuditAction } from '@/common/enums/audit-action.enum';
import { AuditTargetType } from '@/common/enums/audit-target-type.enum';
import { Unit } from '@/modules/units/entities/unit.entity';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, FindOptionsWhere, ILike, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { Property } from './entities/property.entity';
import { PropertiesRepository } from './properties.repository';

@Injectable()
export class PropertiesService {
	constructor(
		private readonly propertiesRepository: PropertiesRepository,
		private readonly auditService: AuditService,
		private readonly dataSource: DataSource,
		@InjectRepository(Unit)
		private readonly unitRepository: Repository<Unit>,
	) { }

	async create(createPropertyDto: CreatePropertyDto, userId: string): Promise<Property> {
		const queryRunner = this.dataSource.createQueryRunner();
		await queryRunner.connect();
		await queryRunner.startTransaction();

		let property: Property;

		try {
			property = await queryRunner.manager.save(
				queryRunner.manager.create(Property, createPropertyDto as any),
			);
			await queryRunner.commitTransaction();
		} catch (err) {
			await queryRunner.rollbackTransaction();
			throw err;
		} finally {
			await queryRunner.release();
		}

		await this.auditService.createLog({
			action: AuditAction.PROPERTY_CREATED,
			performedBy: userId,
			targetType: AuditTargetType.PROPERTY,
			targetId: property.propertyId,
			details: `Property "${property.name}" created at ${property.location}`,
			metadata: {
				propertyId: property.propertyId,
				name: property.name,
				location: property.location,
				totalUnits: property.totalUnits,
			},
		});

		return property;
	}

	async findAll({ page = 1, limit = 20, search, isActive }: {
		page: number;
		limit: number;
		search?: string;
		isActive?: boolean;
	}): Promise<{
		data: Property[];
		pagination: {
			page: number;
			limit: number;
			total: number;
			totalPages: number;
		};
	}> {
		const skip = (page - 1) * limit;
		let where: FindOptionsWhere<Property> | FindOptionsWhere<Property>[] = {};

		if (isActive !== undefined) {
			where = { isActive };
		}

		if (search) {
			const baseWhere = isActive !== undefined ? { isActive } : {};
			where = [
				{ ...baseWhere, name: ILike(`%${search}%`) },
				{ ...baseWhere, location: ILike(`%${search}%`) },
			];
		}

		const [data, total] = await this.propertiesRepository.findAndCount({
			where,
			skip,
			take: limit,
			order: { createdAt: 'DESC' },
		});

		return {
			data,
			pagination: {
				page,
				limit,
				total,
				totalPages: Math.ceil(total / limit),
			},
		};
	}

	async findOne(propertyId: string): Promise<Property> {
		const property = await this.propertiesRepository.findOne({
			where: { propertyId },
		});

		if (!property) {
			throw new NotFoundException(`Property with ID "${propertyId}" not found`);
		}

		return property;
	}

	async update(propertyId: string, updatePropertyDto: UpdatePropertyDto, userId: string): Promise<Property> {
		const property = await this.findOne(propertyId);

		const queryRunner = this.dataSource.createQueryRunner();
		await queryRunner.connect();
		await queryRunner.startTransaction();

		try {
			await queryRunner.manager.update(Property, { propertyId }, updatePropertyDto as any);
			await queryRunner.commitTransaction();
		} catch (err) {
			await queryRunner.rollbackTransaction();
			throw err;
		} finally {
			await queryRunner.release();
		}

		const changedFields = Object.keys(updatePropertyDto).filter(
			key => updatePropertyDto[key] !== undefined,
		);

		await this.auditService.createLog({
			action: AuditAction.PROPERTY_UPDATED,
			performedBy: userId,
			targetType: AuditTargetType.PROPERTY,
			targetId: property.propertyId,
			details: `Property "${property.name}" updated: ${changedFields.join(', ')}`,
			metadata: {
				propertyId: property.propertyId,
				updatedFields: changedFields,
				newValues: updatePropertyDto,
			},
		});

		return this.findOne(propertyId);
	}

	async getPropertyUnits(propertyId: string): Promise<any[]> {
		// Verify property exists
		await this.findOne(propertyId);

		// Will connect to UnitsRepository later
		return [];
	}

	async delete(propertyId: string, userId: string): Promise<void> {
		const property = await this.findOne(propertyId);

		// Check all units belong to this property and none are occupied
		const units = await this.unitRepository.find({ where: { propertyId } });
		const occupiedUnits = units.filter((u) => u.isOccupied);

		if (occupiedUnits.length > 0) {
			const occupiedNumbers = occupiedUnits.map((u) => u.unitNumber).join(', ');
			throw new BadRequestException(
				`Cannot delete property: ${occupiedUnits.length} unit(s) are still occupied (${occupiedNumbers}). ` +
				`Please vacate all tenants before deleting this property.`,
			);
		}

		const queryRunner = this.dataSource.createQueryRunner();
		await queryRunner.connect();
		await queryRunner.startTransaction();

		try {
			// Delete all units first (foreign key constraint)
			if (units.length > 0) {
				await queryRunner.manager.delete(Unit, { propertyId });
			}

			// Delete the property
			await queryRunner.manager.delete(Property, { propertyId });

			await queryRunner.commitTransaction();
		} catch (err) {
			await queryRunner.rollbackTransaction();
			throw err;
		} finally {
			await queryRunner.release();
		}

		await this.auditService.createLog({
			action: AuditAction.PROPERTY_DELETED,
			performedBy: userId,
			targetType: AuditTargetType.PROPERTY,
			targetId: propertyId,
			details: `Property "${property.name}" deleted with ${units.length} unit(s)`,
			metadata: {
				propertyId,
				name: property.name,
				location: property.location,
				unitsDeleted: units.length,
			},
		});
	}
}
