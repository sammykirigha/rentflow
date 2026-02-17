import { AbstractEntity } from '@/database/abstract.entity';
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('vendors')
@Index(['name'])
@Index(['specialty'])
export class Vendor extends AbstractEntity<Vendor> {
	@PrimaryGeneratedColumn('uuid', { name: 'vendor_id' })
	vendorId: string;

	@Column()
	name: string;

	@Column()
	phone: string;

	@Column({ nullable: true })
	email?: string;

	@Column()
	specialty: string;

	@Column({ type: 'decimal', precision: 2, scale: 1, nullable: true })
	rating?: number;

	@Column({ name: 'is_active', default: true })
	@Index()
	isActive: boolean;
}
