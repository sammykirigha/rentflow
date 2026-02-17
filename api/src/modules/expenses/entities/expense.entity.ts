import { AbstractEntity } from '@/database/abstract.entity';
import { Property } from '@/modules/properties/entities/property.entity';
import { Vendor } from '@/modules/vendors/entities/vendor.entity';
import {
	Column,
	Entity,
	Index,
	JoinColumn,
	ManyToOne,
	PrimaryGeneratedColumn,
} from 'typeorm';

export enum ExpenseCategory {
	PLUMBING = 'plumbing',
	ROOFING = 'roofing',
	ELECTRICAL = 'electrical',
	PAINTING = 'painting',
	SECURITY = 'security',
	GENERAL_MAINTENANCE = 'general_maintenance',
	STRUCTURAL = 'structural',
	OTHER = 'other',
}

export enum ExpenseStatus {
	PENDING = 'pending',
	APPROVED = 'approved',
	IN_PROGRESS = 'in_progress',
	COMPLETED = 'completed',
	CANCELLED = 'cancelled',
}

export enum ExpensePriority {
	LOW = 'low',
	MEDIUM = 'medium',
	HIGH = 'high',
	URGENT = 'urgent',
}

@Entity('expenses')
@Index(['propertyId'])
@Index(['category'])
@Index(['status'])
export class Expense extends AbstractEntity<Expense> {
	@PrimaryGeneratedColumn('uuid', { name: 'expense_id' })
	expenseId: string;

	@Column({ name: 'property_id', type: 'uuid' })
	propertyId: string;

	@Column({ type: 'enum', enum: ExpenseCategory })
	category: ExpenseCategory;

	@Column({ type: 'enum', enum: ExpensePriority, default: ExpensePriority.MEDIUM })
	priority: ExpensePriority;

	@Column()
	description: string;

	@Column({ type: 'decimal', precision: 10, scale: 2 })
	amount: number;

	@Column({ name: 'vendor_id', type: 'uuid', nullable: true })
	vendorId?: string;

	@Column({ type: 'enum', enum: ExpenseStatus, default: ExpenseStatus.PENDING })
	status: ExpenseStatus;

	@Column({ name: 'scheduled_date', type: 'timestamp', nullable: true })
	scheduledDate?: Date;

	@Column({ name: 'completed_date', type: 'timestamp', nullable: true })
	completedDate?: Date;

	@Column({ nullable: true })
	notes?: string;

	@Column({ type: 'simple-array', nullable: true })
	photos?: string[];

	// Relations
	@ManyToOne(() => Property, { eager: false })
	@JoinColumn({ name: 'property_id' })
	property: Property;

	@ManyToOne(() => Vendor, { eager: false, nullable: true })
	@JoinColumn({ name: 'vendor_id' })
	vendor?: Vendor;
}
