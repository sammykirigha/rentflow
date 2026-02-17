import { AbstractEntity } from '@/database/abstract.entity';
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('properties')
@Index(['name'])
export class Property extends AbstractEntity<Property> {
	@PrimaryGeneratedColumn('uuid', { name: 'property_id' })
	propertyId: string;

	@Column()
	name: string;

	@Column()
	location: string;

	@Column({ nullable: true })
	address?: string;

	@Column({ name: 'total_units', type: 'int', default: 0 })
	totalUnits: number;

	@Column({ name: 'paybill_number', nullable: true })
	paybillNumber?: string;

	@Column({ name: 'logo_url', nullable: true })
	logoUrl?: string;

	@Column({ name: 'is_active', default: true })
	@Index()
	isActive: boolean;
}
