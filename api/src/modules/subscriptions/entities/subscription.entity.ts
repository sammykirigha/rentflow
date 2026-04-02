import { AbstractEntity } from '@/database/abstract.entity';
import { Organization } from '@/modules/organizations/entities/organization.entity';
import { Column, Entity, Index, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';

export enum SubscriptionPlan {
	BASIC = 'basic',
	PRO = 'pro',
	ENTERPRISE = 'enterprise',
}

export enum SubscriptionStatus {
	ACTIVE = 'active',
	PAST_DUE = 'past_due',
	CANCELLED = 'cancelled',
	TRIAL = 'trial',
}

@Entity('subscriptions')
@Index(['organizationId'], { unique: true })
@Index(['status'])
export class Subscription extends AbstractEntity<Subscription> {
	@PrimaryGeneratedColumn('uuid', { name: 'subscription_id' })
	subscriptionId: string;

	@Column({ name: 'organization_id', type: 'uuid', unique: true })
	organizationId: string;

	@Column({ type: 'enum', enum: SubscriptionPlan, default: SubscriptionPlan.BASIC })
	plan: SubscriptionPlan;

	@Column({ type: 'enum', enum: SubscriptionStatus, default: SubscriptionStatus.TRIAL })
	status: SubscriptionStatus;

	@Column({ name: 'trial_ends_at', type: 'timestamp', nullable: true })
	trialEndsAt?: Date;

	@Column({ name: 'current_period_start', type: 'timestamp', nullable: true })
	currentPeriodStart?: Date;

	@Column({ name: 'current_period_end', type: 'timestamp', nullable: true })
	currentPeriodEnd?: Date;

	// Limits (copied from plan tier on creation, adjustable by super-admin)
	@Column({ name: 'max_properties', type: 'int', default: 3 })
	maxProperties: number;

	@Column({ name: 'max_units', type: 'int', default: 50 })
	maxUnits: number;

	@Column({ name: 'sms_quota_monthly', type: 'int', default: 100 })
	smsQuotaMonthly: number;

	@Column({ name: 'sms_used_this_period', type: 'int', default: 0 })
	smsUsedThisPeriod: number;

	@Column({ name: 'max_manager_users', type: 'int', default: 1 })
	maxManagerUsers: number;

	// Feature flags
	@Column({ name: 'has_pdf_export', type: 'boolean', default: false })
	hasPdfExport: boolean;

	@Column({ name: 'has_bulk_messaging', type: 'boolean', default: false })
	hasBulkMessaging: boolean;

	@Column({ name: 'has_api_access', type: 'boolean', default: false })
	hasApiAccess: boolean;

	// Relations
	@OneToOne(() => Organization, { eager: false })
	@JoinColumn({ name: 'organization_id' })
	organization: Organization;
}
