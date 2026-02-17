import { AbstractEntity } from '@/database/abstract.entity';
import {
	ExpenseCategory,
	ExpensePriority,
	ExpenseStatus,
} from '@/modules/expenses/entities/expense.entity';
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
export class MaintenanceRequest extends AbstractEntity<MaintenanceRequest> {
	@PrimaryGeneratedColumn('uuid', { name: 'maintenance_request_id' })
	maintenanceRequestId: string;

	@Column({ name: 'tenant_id', type: 'uuid' })
	tenantId: string;

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
	@ManyToOne(() => Tenant, { eager: false })
	@JoinColumn({ name: 'tenant_id' })
	tenant: Tenant;
}
