import { AbstractEntity } from '@/database/abstract.entity';
import { Tenant } from '@/modules/tenants/entities/tenant.entity';
import {
	Column,
	Entity,
	Index,
	JoinColumn,
	ManyToOne,
	PrimaryGeneratedColumn,
} from 'typeorm';

export enum InvoiceStatus {
	PAID = 'paid',
	PARTIALLY_PAID = 'partially_paid',
	UNPAID = 'unpaid',
	OVERDUE = 'overdue',
	CANCELLED = 'cancelled',
}

export enum InvoiceType {
	RENT = 'rent',
	SECURITY_DEPOSIT = 'security_deposit',
	SERVICE_FEE = 'service_fee',
	MAINTENANCE = 'maintenance',
	OTHER = 'other',
}

@Entity('invoices')
@Index(['tenantId'])
@Index(['billingMonth'])
@Index(['status'])
@Index(['dueDate'])
@Index(['invoiceType'])
export class Invoice extends AbstractEntity<Invoice> {
	@PrimaryGeneratedColumn('uuid', { name: 'invoice_id' })
	invoiceId: string;

	@Column({ name: 'invoice_number', unique: true })
	invoiceNumber: string;

	@Column({ name: 'invoice_type', type: 'enum', enum: InvoiceType, default: InvoiceType.RENT })
	invoiceType: InvoiceType;

	@Column({ name: 'tenant_id', type: 'uuid', nullable: true })
	tenantId: string | null;

	@Column({ name: 'recipient_name', nullable: true })
	recipientName?: string;

	@Column({ name: 'billing_month', type: 'timestamp' })
	billingMonth: Date;

	@Column({ name: 'rent_amount', type: 'decimal', precision: 10, scale: 2 })
	rentAmount: number;

	@Column({ name: 'water_charge', type: 'decimal', precision: 10, scale: 2, default: 0 })
	waterCharge: number;

	@Column({ name: 'electricity_charge', type: 'decimal', precision: 10, scale: 2, default: 0 })
	electricityCharge: number;

	@Column({ name: 'other_charges', type: 'decimal', precision: 10, scale: 2, default: 0 })
	otherCharges: number;

	@Column({ name: 'other_charges_desc', nullable: true })
	otherChargesDesc?: string;

	@Column({ type: 'decimal', precision: 10, scale: 2 })
	subtotal: number;

	@Column({ name: 'penalty_amount', type: 'decimal', precision: 10, scale: 2, default: 0 })
	penaltyAmount: number;

	@Column({ name: 'total_amount', type: 'decimal', precision: 10, scale: 2 })
	totalAmount: number;

	@Column({ name: 'amount_paid', type: 'decimal', precision: 10, scale: 2, default: 0 })
	amountPaid: number;

	@Column({ name: 'balance_due', type: 'decimal', precision: 10, scale: 2 })
	balanceDue: number;

	@Column({ type: 'enum', enum: InvoiceStatus, default: InvoiceStatus.UNPAID })
	status: InvoiceStatus;

	@Column({ name: 'due_date', type: 'timestamp' })
	dueDate: Date;

	@Column({ name: 'paid_at', type: 'timestamp', nullable: true })
	paidAt?: Date;

	@Column({ name: 'penalty_applied_at', type: 'timestamp', nullable: true })
	penaltyAppliedAt?: Date;

	@Column({ nullable: true })
	notes?: string;

	// Relations
	@ManyToOne(() => Tenant, { eager: false, nullable: true })
	@JoinColumn({ name: 'tenant_id' })
	tenant: Tenant | null;
}
