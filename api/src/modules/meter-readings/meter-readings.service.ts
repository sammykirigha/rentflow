import { AuditAction } from '@/common/enums/audit-action.enum';
import { AuditTargetType } from '@/common/enums/audit-target-type.enum';
import { OrgContextService } from '@/common/services/org-context.service';
import { AuditService } from '@/modules/audit/audit.service';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateMeterReadingDto } from './dto/create-meter-reading.dto';
import { MeterReading, MeterType } from './entities/meter-reading.entity';

@Injectable()
export class MeterReadingsService {
	constructor(
		@InjectRepository(MeterReading)
		private readonly meterReadingRepository: Repository<MeterReading>,
		private readonly orgContext: OrgContextService,
		private readonly auditService: AuditService,
	) {}

	async create(dto: CreateMeterReadingDto, userId: string): Promise<MeterReading> {
		if (dto.currentReading < dto.previousReading) {
			throw new BadRequestException('Current reading cannot be less than previous reading');
		}

		const consumption = dto.currentReading;
		const totalCharge = dto.rate * dto.currentReading;
		const billingMonth = new Date(dto.billingMonth);

		const entity = this.meterReadingRepository.create({
			unitId: dto.unitId,
			meterType: dto.meterType,
			readingDate: new Date(),
			billingMonth,
			previousReading: dto.previousReading,
			currentReading: dto.currentReading,
			consumption,
			rate: dto.rate,
			totalCharge,
			notes: dto.notes,
			organizationId: this.orgContext.organizationId,
		} as any);
		const reading = await this.meterReadingRepository.save(entity) as unknown as MeterReading;

		await this.auditService.createLog({
			action: AuditAction.METER_READING_CREATED,
			performedBy: userId,
			targetType: AuditTargetType.METER_READING,
			targetId: reading.meterReadingId,
			details: `Created ${dto.meterType} meter reading for unit ${dto.unitId}: ${consumption} units at ${dto.rate}/unit = KES ${totalCharge}`,
			metadata: { unitId: dto.unitId, meterType: dto.meterType, consumption, totalCharge },
		});

		return reading;
	}

	async findByUnit(unitId: string, billingMonth?: string): Promise<MeterReading[]> {
		const where: any = {
			unitId,
			organizationId: this.orgContext.organizationId,
		};
		if (billingMonth) {
			where.billingMonth = new Date(billingMonth);
		}
		return this.meterReadingRepository.find({
			where,
			order: { readingDate: 'DESC' },
			relations: ['unit'],
		});
	}

	async findAll(page = 1, limit = 20, unitId?: string, meterType?: MeterType): Promise<{
		data: MeterReading[];
		pagination: { page: number; limit: number; total: number; totalPages: number };
	}> {
		const skip = (page - 1) * limit;
		const qb = this.meterReadingRepository
			.createQueryBuilder('mr')
			.leftJoinAndSelect('mr.unit', 'unit')
			.leftJoinAndSelect('unit.property', 'property')
			.where('mr.organization_id = :orgId', { orgId: this.orgContext.organizationId })
			.orderBy('mr.readingDate', 'DESC')
			.skip(skip)
			.take(limit);

		if (unitId) qb.andWhere('mr.unit_id = :unitId', { unitId });
		if (meterType) qb.andWhere('mr.meter_type = :meterType', { meterType });

		const [data, total] = await qb.getManyAndCount();
		return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
	}

	async getLatestForUnit(unitId: string, meterType: MeterType): Promise<MeterReading | null> {
		return this.meterReadingRepository.findOne({
			where: { unitId, meterType, organizationId: this.orgContext.organizationId } as any,
			order: { readingDate: 'DESC' },
		});
	}
}
