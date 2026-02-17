import { AuditAction } from '@/common/enums/audit-action.enum';
import { AuditTargetType } from '@/common/enums/audit-target-type.enum';
import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, FindOptionsWhere, ILike } from 'typeorm';
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

	async findAll({ page = 1, limit = 10, search, isActive }: {
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
}
