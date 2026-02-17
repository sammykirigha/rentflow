import { AuditAction } from '@/common/enums/audit-action.enum';
import { AuditTargetType } from '@/common/enums/audit-target-type.enum';
import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, FindOptionsWhere, ILike } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { Vendor } from './entities/vendor.entity';
import { VendorsRepository } from './vendors.repository';

@Injectable()
export class VendorsService {
	constructor(
		private readonly vendorsRepository: VendorsRepository,
		private readonly auditService: AuditService,
		private readonly dataSource: DataSource,
	) { }

	async create(createVendorDto: CreateVendorDto, userId: string): Promise<Vendor> {
		const queryRunner = this.dataSource.createQueryRunner();
		await queryRunner.connect();
		await queryRunner.startTransaction();

		let vendor: Vendor;

		try {
			vendor = await queryRunner.manager.save(
				queryRunner.manager.create(Vendor, createVendorDto as any),
			);
			await queryRunner.commitTransaction();
		} catch (err) {
			await queryRunner.rollbackTransaction();
			throw err;
		} finally {
			await queryRunner.release();
		}

		await this.auditService.createLog({
			action: AuditAction.CREATED,
			performedBy: userId,
			targetType: AuditTargetType.VENDOR,
			targetId: vendor.vendorId,
			details: `Vendor "${vendor.name}" created with specialty "${vendor.specialty}"`,
			metadata: {
				vendorId: vendor.vendorId,
				name: vendor.name,
				phone: vendor.phone,
				specialty: vendor.specialty,
			},
		});

		return vendor;
	}

	async findAll({ page = 1, limit = 10, search, isActive }: {
		page: number;
		limit: number;
		search?: string;
		isActive?: boolean;
	}): Promise<{
		data: Vendor[];
		pagination: {
			page: number;
			limit: number;
			total: number;
			totalPages: number;
		};
	}> {
		const skip = (page - 1) * limit;
		let where: FindOptionsWhere<Vendor> | FindOptionsWhere<Vendor>[] = {};

		if (isActive !== undefined) {
			where = { isActive };
		}

		if (search) {
			const baseWhere = isActive !== undefined ? { isActive } : {};
			where = [
				{ ...baseWhere, name: ILike(`%${search}%`) },
				{ ...baseWhere, specialty: ILike(`%${search}%`) },
			];
		}

		const [data, total] = await this.vendorsRepository.findAndCount({
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

	async findOne(vendorId: string): Promise<Vendor> {
		const vendor = await this.vendorsRepository.findOne({
			where: { vendorId },
		});

		if (!vendor) {
			throw new NotFoundException(`Vendor with ID "${vendorId}" not found`);
		}

		return vendor;
	}

	async update(vendorId: string, updateVendorDto: UpdateVendorDto, userId: string): Promise<Vendor> {
		const vendor = await this.findOne(vendorId);

		const queryRunner = this.dataSource.createQueryRunner();
		await queryRunner.connect();
		await queryRunner.startTransaction();

		try {
			await queryRunner.manager.update(Vendor, { vendorId }, updateVendorDto as any);
			await queryRunner.commitTransaction();
		} catch (err) {
			await queryRunner.rollbackTransaction();
			throw err;
		} finally {
			await queryRunner.release();
		}

		const changedFields = Object.keys(updateVendorDto).filter(
			key => updateVendorDto[key] !== undefined,
		);

		await this.auditService.createLog({
			action: AuditAction.UPDATED,
			performedBy: userId,
			targetType: AuditTargetType.VENDOR,
			targetId: vendor.vendorId,
			details: `Vendor "${vendor.name}" updated: ${changedFields.join(', ')}`,
			metadata: {
				vendorId: vendor.vendorId,
				updatedFields: changedFields,
				newValues: updateVendorDto,
			},
		});

		return this.findOne(vendorId);
	}
}
