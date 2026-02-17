import { AbstractEntity } from '@/database/abstract.entity';
import { Property } from '@/modules/properties/entities/property.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';

export enum UnitType {
	STUDIO = 'studio',
	BEDSITTER = 'bedsitter',
	ONE_BEDROOM = 'one_bedroom',
	TWO_BEDROOM = 'two_bedroom',
	THREE_BEDROOM = 'three_bedroom',
}

@Entity('units')
@Unique(['propertyId', 'unitNumber'])
@Index(['propertyId'])
export class Unit extends AbstractEntity<Unit> {
	@PrimaryGeneratedColumn('uuid', { name: 'unit_id' })
	unitId: string;

	@Column({ name: 'unit_number' })
	unitNumber: string;

	@Column({ name: 'property_id', type: 'uuid' })
	propertyId: string;

	@Column({ name: 'unit_type', type: 'enum', enum: UnitType, default: UnitType.ONE_BEDROOM })
	unitType: UnitType;

	@Column({ name: 'rent_amount', type: 'decimal', precision: 10, scale: 2 })
	rentAmount: number;

	@Column({ name: 'is_occupied', default: false })
	isOccupied: boolean;

	// Relations
	@ManyToOne(() => Property, { eager: false })
	@JoinColumn({ name: 'property_id' })
	property: Property;
}
