import { AbstractEntity } from '@/database/abstract.entity';
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum OrganizationStatus {
	ACTIVE = 'active',
	SUSPENDED = 'suspended',
	TRIAL = 'trial',
	CANCELLED = 'cancelled',
}

@Entity('organizations')
@Index(['slug'], { unique: true })
@Index(['status'])
@Index(['mpesaShortcode'], { unique: true, where: '"mpesa_shortcode" IS NOT NULL' })
export class Organization extends AbstractEntity<Organization> {
	@PrimaryGeneratedColumn('uuid', { name: 'organization_id' })
	organizationId: string;

	@Column()
	name: string;

	@Column({ unique: true })
	slug: string;

	@Column({
		type: 'enum',
		enum: OrganizationStatus,
		default: OrganizationStatus.TRIAL,
	})
	status: OrganizationStatus;

	@Column({ name: 'owner_user_id', type: 'uuid' })
	ownerUserId: string;

	// M-Pesa credentials (encrypted)
	@Column({ name: 'mpesa_consumer_key', nullable: true })
	mpesaConsumerKey?: string;

	@Column({ name: 'mpesa_consumer_secret', nullable: true })
	mpesaConsumerSecret?: string;

	@Column({ name: 'mpesa_passkey', nullable: true })
	mpesaPasskey?: string;

	@Column({ name: 'mpesa_shortcode', nullable: true })
	mpesaShortcode?: string;

	@Column({ name: 'mpesa_environment', default: 'sandbox' })
	mpesaEnvironment: string;

	@Column({ name: 'mpesa_callback_base_url', nullable: true })
	mpesaCallbackBaseUrl?: string;

	// SMS credentials (encrypted)
	@Column({ name: 'at_api_key', nullable: true })
	atApiKey?: string;

	@Column({ name: 'at_username', nullable: true })
	atUsername?: string;

	@Column({ name: 'at_sender_id', nullable: true })
	atSenderId?: string;

	// Branding
	@Column({ name: 'logo_url', nullable: true })
	logoUrl?: string;

	@Column({ name: 'primary_color', nullable: true })
	primaryColor?: string;

	@Column({ nullable: true })
	tagline?: string;

	@Column({ name: 'support_email', nullable: true })
	supportEmail?: string;

	@Column({ name: 'support_phone', nullable: true })
	supportPhone?: string;
}
