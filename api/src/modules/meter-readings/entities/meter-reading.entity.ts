import { OrgScopedEntity } from '@/database/org-scoped.entity';
import { Unit } from '@/modules/units/entities/unit.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

export enum MeterType {
	WATER = 'water',
	ELECTRICITY = 'electricity',
}

@Entity('meter_readings')
@Index(['unitId', 'billingMonth'])
@Index(['organizationId', 'billingMonth'])
export class MeterReading extends OrgScopedEntity<MeterReading> {
	@PrimaryGeneratedColumn('uuid', { name: 'meter_reading_id' })
	meterReadingId: string;

	@Column({ name: 'unit_id', type: 'uuid' })
	unitId: string;

	@Column({ name: 'meter_type', type: 'enum', enum: MeterType })
	meterType: MeterType;

	@Column({ name: 'reading_date', type: 'timestamp' })
	readingDate: Date;

	@Column({ name: 'billing_month', type: 'timestamp' })
	billingMonth: Date;

	@Column({ name: 'previous_reading', type: 'decimal', precision: 10, scale: 2, default: 0 })
	previousReading: number;

	@Column({ name: 'current_reading', type: 'decimal', precision: 10, scale: 2 })
	currentReading: number;

	@Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
	consumption: number;

	@Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
	rate: number;

	@Column({ name: 'total_charge', type: 'decimal', precision: 10, scale: 2, default: 0 })
	totalCharge: number;

	@Column({ nullable: true })
	notes?: string;

	@ManyToOne(() => Unit)
	@JoinColumn({ name: 'unit_id' })
	unit: Unit;
}
