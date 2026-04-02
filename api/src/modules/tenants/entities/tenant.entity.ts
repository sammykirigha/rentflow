import { OrgScopedEntity } from '@/database/org-scoped.entity';
import { User } from '@/modules/users/entities/user.entity';
import { Unit } from '@/modules/units/entities/unit.entity';
import { Column, Entity, Index, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';

export enum TenantStatus {
	ACTIVE = 'active',
	NOTICE_PERIOD = 'notice_period',
	VACATED = 'vacated',
}

export enum DepositStatus {
	PENDING = 'pending',
	COLLECTED = 'collected',
	PARTIALLY_REFUNDED = 'partially_refunded',
	FULLY_REFUNDED = 'fully_refunded',
}

@Entity('tenants')
@Index(['status'])
@Index(['organizationId', 'status'])
export class Tenant extends OrgScopedEntity<Tenant> {
	@PrimaryGeneratedColumn('uuid', { name: 'tenant_id' })
	tenantId: string;

	@Column({ name: 'user_id', type: 'uuid', unique: true })
	userId: string;

	@Column({ name: 'unit_id', type: 'uuid', unique: true, nullable: true })
	unitId?: string;

	@Column({ name: 'wallet_balance', type: 'decimal', precision: 10, scale: 2, default: 0 })
	walletBalance: number;

	@Column({ name: 'deposit_amount', type: 'decimal', precision: 10, scale: 2, default: 0 })
	depositAmount: number;

	@Column({ name: 'deposit_status', type: 'enum', enum: DepositStatus, default: DepositStatus.PENDING })
	depositStatus: DepositStatus;

	@Column({ type: 'enum', enum: TenantStatus, default: TenantStatus.ACTIVE })
	status: TenantStatus;

	@Column({ name: 'lease_start', type: 'timestamp' })
	leaseStart: Date;

	@Column({ name: 'lease_end', type: 'timestamp', nullable: true })
	leaseEnd?: Date;

	@Column({ name: 'id_number', type: 'varchar', nullable: true })
	idNumber?: string;

	@Column({ name: 'id_copy_key', type: 'varchar', nullable: true })
	idCopyKey?: string;

	@Column({ name: 'kra_certificate_key', type: 'varchar', nullable: true })
	kraCertificateKey?: string;

	// Relations
	@OneToOne(() => User, { eager: true })
	@JoinColumn({ name: 'user_id' })
	user: User;

	@OneToOne(() => Unit, { eager: true })
	@JoinColumn({ name: 'unit_id' })
	unit: Unit;
}
