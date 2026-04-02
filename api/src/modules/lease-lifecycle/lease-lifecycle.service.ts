import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, LessThanOrEqual, IsNull, Not, Repository, Between } from 'typeorm';
import { Tenant, TenantStatus } from '@/modules/tenants/entities/tenant.entity';
import { Unit } from '@/modules/units/entities/unit.entity';
import { User } from '@/modules/users/entities/user.entity';
import {
	Notification,
	NotificationChannel,
	NotificationStatus,
	NotificationType,
} from '@/modules/notifications/entities/notification.entity';
import { AuditService } from '@/modules/audit/audit.service';
import { AuditAction } from '@/common/enums/audit-action.enum';
import { AuditTargetType } from '@/common/enums/audit-target-type.enum';
import { UserRole } from '@/common/enums/user-role.enum';
import { Role } from '@/modules/permissions/entities/role.entity';
import { SmsService } from '@/modules/sms/sms.service';
import { MailService } from '@/modules/mail/mail.service';

/**
 * Convert a Date to the Nairobi calendar date (UTC+3).
 */
function toNairobiDate(date: Date): { year: number; month: number; day: number } {
	const eatMs = date.getTime() + 3 * 60 * 60 * 1000;
	const eatDate = new Date(eatMs);
	return {
		year: eatDate.getUTCFullYear(),
		month: eatDate.getUTCMonth() + 1,
		day: eatDate.getUTCDate(),
	};
}

function getNairobiDayBoundsUTC(date: Date): { start: Date; end: Date } {
	const nairobi = toNairobiDate(date);
	const startUTC = new Date(Date.UTC(nairobi.year, nairobi.month - 1, nairobi.day, 0, 0, 0, 0));
	startUTC.setTime(startUTC.getTime() - 3 * 60 * 60 * 1000);
	const endUTC = new Date(startUTC.getTime() + 24 * 60 * 60 * 1000);
	return { start: startUTC, end: endUTC };
}

@Injectable()
export class LeaseLifecycleService {
	private readonly logger = new Logger(LeaseLifecycleService.name);

	constructor(
		private readonly dataSource: DataSource,
		private readonly auditService: AuditService,
		private readonly smsService: SmsService,
		private readonly mailService: MailService,
		@InjectRepository(Tenant)
		private readonly tenantRepository: Repository<Tenant>,
		@InjectRepository(Unit)
		private readonly unitRepository: Repository<Unit>,
		@InjectRepository(Notification)
		private readonly notificationRepository: Repository<Notification>,
	) {}

	/**
	 * Runs daily at 6 AM UTC (9 AM EAT) to check lease expiries and vacancies.
	 */
	@Cron('0 6 * * *')
	async handleDailyLeaseChecks(): Promise<void> {
		this.logger.log('Cron triggered: daily lease lifecycle checks');
		await this.checkLeaseExpiries();
		await this.sendVacancyAlerts();
	}

	/**
	 * Check lease expiries and send reminders at 90/60/30 days.
	 * Auto-transition to NOTICE_PERIOD at lease end, VACATED at lease end + 30 days.
	 */
	async checkLeaseExpiries(): Promise<void> {
		const now = new Date();
		const systemUserId = await this.getSystemUserId();

		// Check 90, 60, 30 day thresholds
		const thresholds = [
			{ days: 90, type: NotificationType.LEASE_EXPIRY_90 },
			{ days: 60, type: NotificationType.LEASE_EXPIRY_60 },
			{ days: 30, type: NotificationType.LEASE_EXPIRY_30 },
		];

		for (const threshold of thresholds) {
			const targetDate = new Date(now);
			targetDate.setDate(targetDate.getDate() + threshold.days);

			// Find tenants whose lease ends on this exact day (within the same Nairobi day)
			const targetNairobi = toNairobiDate(targetDate);
			const dayStart = new Date(Date.UTC(targetNairobi.year, targetNairobi.month - 1, targetNairobi.day, 0, 0, 0));
			dayStart.setTime(dayStart.getTime() - 3 * 60 * 60 * 1000);
			const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

			const tenants = await this.tenantRepository.find({
				where: {
					status: TenantStatus.ACTIVE,
					leaseEnd: Between(dayStart, dayEnd),
				},
				relations: ['user', 'unit', 'unit.property'],
			});

			for (const tenant of tenants) {
				const alreadySent = await this.hasNotificationBeenSentToday(
					tenant.tenantId,
					threshold.type,
					now,
				);
				if (alreadySent) continue;

				await this.sendLeaseExpiryReminder(tenant, threshold.days, threshold.type, now, systemUserId);
			}
		}

		// Auto-transition: lease ended → NOTICE_PERIOD
		const expiredActive = await this.tenantRepository.find({
			where: {
				status: TenantStatus.ACTIVE,
				leaseEnd: Not(IsNull()),
			},
			relations: ['user', 'unit'],
		});

		for (const tenant of expiredActive) {
			if (tenant.leaseEnd && tenant.leaseEnd <= now) {
				await this.tenantRepository.update(
					{ tenantId: tenant.tenantId },
					{ status: TenantStatus.NOTICE_PERIOD },
				);

				this.logger.log(`Tenant ${tenant.tenantId} auto-transitioned to NOTICE_PERIOD (lease ended ${tenant.leaseEnd.toISOString()})`);

				if (systemUserId) {
					await this.auditService.createLog({
						action: AuditAction.LEASE_AUTO_NOTICE_PERIOD,
						performedBy: systemUserId,
						performerName: 'Lease Lifecycle Service',
						targetType: AuditTargetType.TENANT,
						targetId: tenant.tenantId,
						details: `Tenant auto-transitioned to NOTICE_PERIOD. Lease ended ${tenant.leaseEnd.toISOString()}.`,
					});
				}
			}
		}

		// Auto-transition: notice period > 30 days → VACATED + mark unit unoccupied
		const noticePeriodTenants = await this.tenantRepository.find({
			where: {
				status: TenantStatus.NOTICE_PERIOD,
				leaseEnd: Not(IsNull()),
			},
			relations: ['unit'],
		});

		for (const tenant of noticePeriodTenants) {
			if (!tenant.leaseEnd) continue;
			const daysSinceEnd = Math.floor((now.getTime() - tenant.leaseEnd.getTime()) / (24 * 60 * 60 * 1000));

			if (daysSinceEnd >= 30) {
				await this.dataSource.transaction(async (manager) => {
					await manager.update(Tenant, { tenantId: tenant.tenantId }, {
						status: TenantStatus.VACATED,
					});

					if (tenant.unitId) {
						await manager.update(Unit, { unitId: tenant.unitId }, {
							isOccupied: false,
						});
					}
				});

				this.logger.log(`Tenant ${tenant.tenantId} auto-vacated (30 days after lease end)`);

				if (systemUserId) {
					await this.auditService.createLog({
						action: AuditAction.LEASE_AUTO_VACATED,
						performedBy: systemUserId,
						performerName: 'Lease Lifecycle Service',
						targetType: AuditTargetType.TENANT,
						targetId: tenant.tenantId,
						details: `Tenant auto-vacated. Lease ended ${tenant.leaseEnd.toISOString()}, 30+ days in notice period.`,
					});
				}
			}
		}
	}

	/**
	 * Send vacancy alerts for units that have been unoccupied for > 7 days.
	 */
	async sendVacancyAlerts(): Promise<void> {
		const now = new Date();
		const systemUserId = await this.getSystemUserId();

		const sevenDaysAgo = new Date(now);
		sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

		const vacantUnits = await this.unitRepository.find({
			where: {
				isOccupied: false,
				updatedAt: LessThanOrEqual(sevenDaysAgo),
			},
			relations: ['property'],
		});

		if (vacantUnits.length === 0) return;

		// Check if we already sent a vacancy alert today
		const { start, end } = getNairobiDayBoundsUTC(now);
		const alreadySentToday = await this.notificationRepository.count({
			where: {
				type: NotificationType.VACANCY_ALERT,
				sentAt: Between(start, end),
			},
		});

		if (alreadySentToday > 0) return;

		// Find org owner
		const ownerRole = await this.dataSource.getRepository(Role).findOne({
			where: { name: UserRole.ORG_OWNER },
		});
		const ownerUser = ownerRole
			? await this.dataSource.getRepository(User).findOne({ where: { roleId: ownerRole.roleId } })
			: null;

		if (!ownerUser) return;

		const unitList = vacantUnits
			.map((u) => `${u.property?.name || 'Unknown'} — ${u.unitNumber}`)
			.join(', ');

		// SMS
		if (ownerUser.phone) {
			const sms = `RentFlow: ${vacantUnits.length} unit(s) have been vacant for 7+ days: ${unitList}. Consider listing them.`;
			try {
				await this.smsService.sendSms(ownerUser.phone, sms);
			} catch (err) {
				this.logger.error(`Failed to send vacancy alert SMS: ${err.message}`);
			}
		}

		// Email
		if (ownerUser.email) {
			const rows = vacantUnits
				.map((u) => `<tr><td style="padding:6px 8px">${u.property?.name || '-'}</td><td style="padding:6px 8px">${u.unitNumber}</td></tr>`)
				.join('');
			const html = `
				<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
					<h2 style="color:#d97706">Vacancy Alert</h2>
					<p>${vacantUnits.length} unit(s) have been vacant for more than 7 days:</p>
					<table style="width:100%;border-collapse:collapse;margin:16px 0">
						<thead><tr style="background:#f9fafb;border-bottom:2px solid #e5e7eb"><th style="padding:8px;text-align:left">Property</th><th style="padding:8px;text-align:left">Unit</th></tr></thead>
						<tbody>${rows}</tbody>
					</table>
					<p>Consider marketing these units to minimize vacancy losses.</p>
				</div>
			`;
			try {
				await this.mailService.sendEmail({
					to: ownerUser.email,
					subject: `Vacancy Alert: ${vacantUnits.length} Unit(s) Vacant for 7+ Days`,
					html,
				});
			} catch (err) {
				this.logger.error(`Failed to send vacancy alert email: ${err.message}`);
			}
		}

		if (systemUserId) {
			await this.auditService.createLog({
				action: AuditAction.VACANCY_ALERT_SENT,
				performedBy: systemUserId,
				performerName: 'Lease Lifecycle Service',
				targetType: AuditTargetType.UNIT,
				details: `Vacancy alert sent: ${vacantUnits.length} units vacant for 7+ days`,
				metadata: { unitCount: vacantUnits.length, units: unitList },
			});
		}
	}

	private async sendLeaseExpiryReminder(
		tenant: Tenant,
		daysRemaining: number,
		type: NotificationType,
		now: Date,
		systemUserId?: string,
	): Promise<void> {
		const user = tenant.user;
		if (!user) return;

		const unitNumber = tenant.unit?.unitNumber || '-';
		const propertyName = tenant.unit?.property?.name || '-';
		const leaseEndStr = tenant.leaseEnd
			? `${toNairobiDate(tenant.leaseEnd).day}/${toNairobiDate(tenant.leaseEnd).month}/${toNairobiDate(tenant.leaseEnd).year}`
			: '-';

		// SMS
		const sms = `RentFlow: Your lease for ${unitNumber} (${propertyName}) expires in ${daysRemaining} days (${leaseEndStr}). Please contact your property manager to discuss renewal.`;

		if (user.phone) {
			try {
				await this.smsService.sendSms(user.phone, sms);
				await this.notificationRepository.save(
					this.notificationRepository.create({
						tenantId: tenant.tenantId,
						type,
						channel: NotificationChannel.SMS,
						message: sms,
						sentAt: now,
						status: NotificationStatus.SENT,
					}),
				);
			} catch (err) {
				this.logger.error(`Lease expiry SMS failed: ${err.message}`);
			}
		}

		// Email
		if (user.email) {
			const html = `
				<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
					<h2 style="color:#d97706">Lease Expiry Reminder</h2>
					<p>Dear ${user.firstName || 'Tenant'},</p>
					<p>Your lease for <strong>${unitNumber}</strong> at <strong>${propertyName}</strong> will expire in <strong>${daysRemaining} days</strong> on <strong>${leaseEndStr}</strong>.</p>
					<p>Please contact your property manager to discuss lease renewal options.</p>
					<p>Regards,<br/>RentFlow</p>
				</div>
			`;
			try {
				await this.mailService.sendEmail({
					to: user.email,
					subject: `Lease Expiry in ${daysRemaining} Days — ${unitNumber}`,
					html,
				});
				await this.notificationRepository.save(
					this.notificationRepository.create({
						tenantId: tenant.tenantId,
						type,
						channel: NotificationChannel.EMAIL,
						subject: `Lease Expiry in ${daysRemaining} Days`,
						message: html,
						sentAt: now,
						status: NotificationStatus.SENT,
					}),
				);
			} catch (err) {
				this.logger.error(`Lease expiry email failed: ${err.message}`);
			}
		}

		if (systemUserId) {
			await this.auditService.createLog({
				action: AuditAction.LEASE_EXPIRY_REMINDER,
				performedBy: systemUserId,
				performerName: 'Lease Lifecycle Service',
				targetType: AuditTargetType.TENANT,
				targetId: tenant.tenantId,
				details: `Lease expiry reminder (${daysRemaining} days) sent for tenant in ${unitNumber}`,
				metadata: { daysRemaining, leaseEnd: tenant.leaseEnd?.toISOString(), unitNumber },
			});
		}
	}

	private async hasNotificationBeenSentToday(
		tenantId: string,
		type: NotificationType,
		now: Date,
	): Promise<boolean> {
		const { start, end } = getNairobiDayBoundsUTC(now);
		const count = await this.notificationRepository.count({
			where: { tenantId, type, sentAt: Between(start, end) },
		});
		return count > 0;
	}

	private async getSystemUserId(): Promise<string | undefined> {
		const role = await this.dataSource.getRepository(Role).findOne({
			where: { name: In([UserRole.LANDLORD, UserRole.ORG_OWNER] as UserRole[]) },
		});
		if (!role) return undefined;
		const user = await this.dataSource.getRepository(User).findOne({
			where: { roleId: role.roleId },
		});
		return user?.userId;
	}
}
