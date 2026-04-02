import { OrgScopedEntity } from '@/database/org-scoped.entity';
import { Property } from '@/modules/properties/entities/property.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

export enum EscalationStatus {
	PENDING = 'pending',
	NOTIFIED = 'notified',
	APPLIED = 'applied',
	CANCELLED = 'cancelled',
}

@Entity('rent_escalations')
@Index(['propertyId', 'effectiveDate', 'status'])
@Index(['organizationId', 'status'])
export class RentEscalation extends OrgScopedEntity<RentEscalation> {
	@PrimaryGeneratedColumn('uuid', { name: 'rent_escalation_id' })
	rentEscalationId: string;

	@Column({ name: 'property_id', type: 'uuid' })
	propertyId: string;

	@Column({ type: 'decimal', precision: 5, scale: 2 })
	percentage: number;

	@Column({ name: 'effective_date', type: 'timestamp' })
	effectiveDate: Date;

	@Column({ type: 'enum', enum: EscalationStatus, default: EscalationStatus.PENDING })
	status: EscalationStatus;

	@Column({ name: 'notified_at', type: 'timestamp', nullable: true })
	notifiedAt?: Date;

	@Column({ name: 'applied_at', type: 'timestamp', nullable: true })
	appliedAt?: Date;

	@Column({ nullable: true })
	notes?: string;

	@ManyToOne(() => Property)
	@JoinColumn({ name: 'property_id' })
	property: Property;
}
