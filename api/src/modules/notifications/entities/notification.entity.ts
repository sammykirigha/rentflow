import { OrgScopedEntity } from '@/database/org-scoped.entity';
import { Invoice } from '@/modules/invoices/entities/invoice.entity';
import { Tenant } from '@/modules/tenants/entities/tenant.entity';
import {
	Column,
	Entity,
	Index,
	JoinColumn,
	ManyToOne,
	PrimaryGeneratedColumn,
} from 'typeorm';

export enum NotificationChannel {
	SMS = 'sms',
	EMAIL = 'email',
	BOTH = 'both',
}

export enum NotificationType {
	INVOICE_SENT = 'invoice_sent',
	RECEIPT_SENT = 'receipt_sent',
	PAYMENT_REMINDER = 'payment_reminder',
	PENALTY_NOTICE = 'penalty_notice',
	MAINTENANCE_UPDATE = 'maintenance_update',
	LEASE_RENEWAL = 'lease_renewal',
	GENERAL = 'general',
	WELCOME_CREDENTIALS = 'welcome_credentials',
	// Smart Reminder types
	FRIENDLY_REMINDER = 'friendly_reminder',
	DUE_TODAY_WARNING = 'due_today_warning',
	LANDLORD_ESCALATION = 'landlord_escalation',
	// Lease Lifecycle types
	LEASE_EXPIRY_90 = 'lease_expiry_90',
	LEASE_EXPIRY_60 = 'lease_expiry_60',
	LEASE_EXPIRY_30 = 'lease_expiry_30',
	VACANCY_ALERT = 'vacancy_alert',
	// Statement
	STATEMENT_SENT = 'statement_sent',
	// Owner Report
	OWNER_REPORT = 'owner_report',
}

export enum NotificationStatus {
	PENDING = 'pending',
	SENT = 'sent',
	FAILED = 'failed',
}

@Entity('notifications')
@Index(['tenantId'])
@Index(['type'])
@Index(['sentAt'])
@Index(['organizationId', 'tenantId'])
export class Notification extends OrgScopedEntity<Notification> {
	@PrimaryGeneratedColumn('uuid', { name: 'notification_id' })
	notificationId: string;

	@Column({ name: 'tenant_id', type: 'uuid' })
	tenantId: string;

	@Column({ name: 'invoice_id', type: 'uuid', nullable: true })
	invoiceId?: string;

	@Column({ type: 'enum', enum: NotificationType })
	type: NotificationType;

	@Column({ type: 'enum', enum: NotificationChannel })
	channel: NotificationChannel;

	@Column({ nullable: true })
	subject?: string;

	@Column({ type: 'text' })
	message: string;

	@Column({ name: 'sent_at', type: 'timestamp', nullable: true })
	sentAt?: Date;

	@Column({ name: 'delivered_at', type: 'timestamp', nullable: true })
	deliveredAt?: Date;

	@Column({ name: 'fail_reason', nullable: true })
	failReason?: string;

	@Column({ type: 'enum', enum: NotificationStatus, default: NotificationStatus.PENDING })
	status: NotificationStatus;

	@Column({ name: 'retry_count', type: 'int', default: 0 })
	retryCount: number;

	@Column({ name: 'read_at', type: 'timestamp', nullable: true })
	readAt?: Date;

	// Relations
	@ManyToOne(() => Tenant, { eager: false })
	@JoinColumn({ name: 'tenant_id' })
	tenant: Tenant;

	@ManyToOne(() => Invoice, { eager: false, nullable: true })
	@JoinColumn({ name: 'invoice_id' })
	invoice?: Invoice;
}
