import { AuditAction } from '@/common/enums/audit-action.enum';
import { AuditTargetType } from '@/common/enums/audit-target-type.enum';
import { OrgContextService } from '@/common/services/org-context.service';
import { AuditService } from '@/modules/audit/audit.service';
import { Unit } from '@/modules/units/entities/unit.entity';
import { Tenant, TenantStatus } from '@/modules/tenants/entities/tenant.entity';
import { SmsService } from '@/modules/sms/sms.service';
import { MailService } from '@/modules/mail/mail.service';
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, LessThanOrEqual, Repository } from 'typeorm';
import { CreateRentEscalationDto } from './dto/create-rent-escalation.dto';
import { EscalationStatus, RentEscalation } from './entities/rent-escalation.entity';

@Injectable()
export class RentEscalationsService {
	private readonly logger = new Logger(RentEscalationsService.name);

	constructor(
		@InjectRepository(RentEscalation)
		private readonly escalationRepository: Repository<RentEscalation>,
		private readonly orgContext: OrgContextService,
		private readonly auditService: AuditService,
		private readonly smsService: SmsService,
		private readonly mailService: MailService,
		private readonly dataSource: DataSource,
	) {}

	async create(dto: CreateRentEscalationDto, userId: string): Promise<RentEscalation> {
		if (dto.percentage > 50) {
			throw new BadRequestException('Escalation percentage cannot exceed 50%');
		}

		const entity = this.escalationRepository.create({
			propertyId: dto.propertyId,
			percentage: dto.percentage,
			effectiveDate: new Date(dto.effectiveDate),
			status: EscalationStatus.PENDING,
			notes: dto.notes,
			organizationId: this.orgContext.organizationId,
		} as any);
		const escalation = await this.escalationRepository.save(entity) as unknown as RentEscalation;

		await this.auditService.createLog({
			action: AuditAction.RENT_ESCALATION_CREATED,
			performedBy: userId,
			targetType: AuditTargetType.RENT_ESCALATION,
			targetId: escalation.rentEscalationId,
			details: `Created ${dto.percentage}% rent escalation for property ${dto.propertyId}, effective ${dto.effectiveDate}`,
		});

		return escalation;
	}

	async findAll(page = 1, limit = 20, propertyId?: string): Promise<{
		data: RentEscalation[];
		pagination: { page: number; limit: number; total: number; totalPages: number };
	}> {
		const skip = (page - 1) * limit;
		const qb = this.escalationRepository
			.createQueryBuilder('re')
			.leftJoinAndSelect('re.property', 'property')
			.where('re.organization_id = :orgId', { orgId: this.orgContext.organizationId })
			.orderBy('re.effectiveDate', 'DESC')
			.skip(skip)
			.take(limit);

		if (propertyId) qb.andWhere('re.property_id = :propertyId', { propertyId });

		const [data, total] = await qb.getManyAndCount();
		return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
	}

	async cancel(escalationId: string, userId: string): Promise<RentEscalation> {
		const escalation = await this.escalationRepository.findOne({
			where: { rentEscalationId: escalationId } as any,
		});
		if (!escalation) throw new NotFoundException('Escalation not found');
		if (escalation.status === EscalationStatus.APPLIED) {
			throw new BadRequestException('Cannot cancel an already applied escalation');
		}

		escalation.status = EscalationStatus.CANCELLED;
		const saved = await this.escalationRepository.save(escalation);

		await this.auditService.createLog({
			action: AuditAction.RENT_ESCALATION_CANCELLED,
			performedBy: userId,
			targetType: AuditTargetType.RENT_ESCALATION,
			targetId: escalationId,
			details: `Cancelled rent escalation`,
		});

		return saved;
	}

	@Cron('0 7 * * *')
	async processEscalations(): Promise<void> {
		this.logger.log('Processing rent escalations...');
		const now = new Date();
		const thirtyDaysFromNow = new Date(now);
		thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

		// Notify 30 days before effective date
		const pendingToNotify = await this.escalationRepository.find({
			where: {
				status: EscalationStatus.PENDING,
				effectiveDate: LessThanOrEqual(thirtyDaysFromNow),
			} as any,
			relations: ['property'],
		});

		for (const esc of pendingToNotify) {
			try {
				const tenants = await this.dataSource.getRepository(Tenant).find({
					where: { status: TenantStatus.ACTIVE },
					relations: ['user', 'unit'],
				});

				const affectedTenants = tenants.filter(t => t.unit?.propertyId === esc.propertyId);

				for (const tenant of affectedTenants) {
					if (!tenant.user) continue;
					const currentRent = Number(tenant.unit?.rentAmount || 0);
					const newRent = Math.round(currentRent * (1 + Number(esc.percentage) / 100));
					const effectiveStr = esc.effectiveDate.toLocaleDateString('en-KE');

					if (tenant.user.phone) {
						try {
							await this.smsService.sendSms(
								tenant.user.phone,
								`RentFlow: Notice of rent adjustment. Your rent for ${tenant.unit?.unitNumber} will increase by ${esc.percentage}% from KES ${currentRent.toLocaleString()} to KES ${newRent.toLocaleString()} effective ${effectiveStr}.`,
							);
						} catch (err) {
							this.logger.error(`Escalation SMS failed: ${err.message}`);
						}
					}

					if (tenant.user.email) {
						try {
							await this.mailService.sendEmail({
								to: tenant.user.email,
								subject: `Notice of Rent Adjustment — ${tenant.unit?.unitNumber}`,
								html: `<p>Dear ${tenant.user.firstName},</p><p>Your rent for <strong>${tenant.unit?.unitNumber}</strong> at <strong>${esc.property?.name}</strong> will increase by <strong>${esc.percentage}%</strong> from <strong>KES ${currentRent.toLocaleString()}</strong> to <strong>KES ${newRent.toLocaleString()}</strong> effective <strong>${effectiveStr}</strong>.</p><p>Regards,<br/>RentFlow</p>`,
							});
						} catch (err) {
							this.logger.error(`Escalation email failed: ${err.message}`);
						}
					}
				}

				esc.status = EscalationStatus.NOTIFIED;
				esc.notifiedAt = now;
				await this.escalationRepository.save(esc);
			} catch (err) {
				this.logger.error(`Failed to process escalation ${esc.rentEscalationId}: ${err.message}`);
			}
		}

		// Apply on effective date
		const toApply = await this.escalationRepository.find({
			where: {
				status: EscalationStatus.NOTIFIED,
				effectiveDate: LessThanOrEqual(now),
			} as any,
			relations: ['property'],
		});

		for (const esc of toApply) {
			try {
				const units = await this.dataSource.getRepository(Unit).find({
					where: { propertyId: esc.propertyId } as any,
				});

				for (const unit of units) {
					const oldRent = Number(unit.rentAmount);
					const newRent = Math.round(oldRent * (1 + Number(esc.percentage) / 100));
					await this.dataSource.getRepository(Unit).update(
						{ unitId: unit.unitId } as any,
						{ rentAmount: newRent },
					);
				}

				esc.status = EscalationStatus.APPLIED;
				esc.appliedAt = now;
				await this.escalationRepository.save(esc);

				this.logger.log(`Applied ${esc.percentage}% escalation to ${units.length} units in property ${esc.property?.name}`);
			} catch (err) {
				this.logger.error(`Failed to apply escalation ${esc.rentEscalationId}: ${err.message}`);
			}
		}
	}
}
