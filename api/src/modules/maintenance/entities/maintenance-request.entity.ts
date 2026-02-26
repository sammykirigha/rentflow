import { AbstractEntity } from '@/database/abstract.entity';
import {
	ExpenseCategory,
	ExpensePriority,
	ExpenseStatus,
} from '@/modules/expenses/entities/expense.entity';
import { Property } from '@/modules/properties/entities/property.entity';
import { Tenant } from '@/modules/tenants/entities/tenant.entity';
import {
	Column,
	Entity,
	Index,
	JoinColumn,
	ManyToOne,
	PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('maintenance_requests')
@Index(['tenantId'])
@Index(['status'])
@Index(['propertyId'])
export class MaintenanceRequest extends AbstractEntity<MaintenanceRequest> {
	@PrimaryGeneratedColumn('uuid', { name: 'maintenance_request_id' })
	maintenanceRequestId: string;

	@Column({ name: 'tenant_id', type: 'uuid', nullable: true })
	tenantId?: string | null;

	@Column({ name: 'property_id', type: 'uuid', nullable: true })
	propertyId?: string | null;

	@Column()
	description: string;

	@Column({ type: 'enum', enum: ExpenseCategory })
	category: ExpenseCategory;

	@Column({ type: 'enum', enum: ExpensePriority, default: ExpensePriority.MEDIUM })
	priority: ExpensePriority;

	@Column({ type: 'simple-array', nullable: true })
	photos?: string[];

	@Column({ type: 'enum', enum: ExpenseStatus, default: ExpenseStatus.PENDING })
	status: ExpenseStatus;

	@Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
	resolvedAt?: Date;

	// Relations
	@ManyToOne(() => Tenant, { eager: false, nullable: true })
	@JoinColumn({ name: 'tenant_id' })
	tenant?: Tenant;

	@ManyToOne(() => Property, { eager: false, nullable: true })
	@JoinColumn({ name: 'property_id' })
	property?: Property;
}
