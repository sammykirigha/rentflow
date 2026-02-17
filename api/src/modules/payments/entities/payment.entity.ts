import { AbstractEntity } from '@/database/abstract.entity';
import { Tenant } from '@/modules/tenants/entities/tenant.entity';
import { Invoice } from '@/modules/invoices/entities/invoice.entity';
import {
	Column,
	Entity,
	Index,
	JoinColumn,
	ManyToOne,
	PrimaryGeneratedColumn,
} from 'typeorm';

export enum PaymentMethod {
	MPESA_PAYBILL = 'mpesa_paybill',
	MPESA_STK_PUSH = 'mpesa_stk_push',
	WALLET_DEDUCTION = 'wallet_deduction',
	MANUAL = 'manual',
}

export enum PaymentStatus {
	PENDING = 'pending',
	COMPLETED = 'completed',
	FAILED = 'failed',
	REVERSED = 'reversed',
}

@Entity('payments')
@Index(['tenantId'])
@Index(['invoiceId'])
@Index(['mpesaReceiptNumber'])
export class Payment extends AbstractEntity<Payment> {
	@PrimaryGeneratedColumn('uuid', { name: 'payment_id' })
	paymentId: string;

	@Column({ name: 'tenant_id', type: 'uuid' })
	tenantId: string;

	@Column({ name: 'invoice_id', type: 'uuid', nullable: true })
	invoiceId?: string;

	@Column({ type: 'decimal', precision: 10, scale: 2 })
	amount: number;

	@Column({ type: 'enum', enum: PaymentMethod })
	method: PaymentMethod;

	@Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
	status: PaymentStatus;

	@Column({ name: 'mpesa_receipt_number', nullable: true, unique: true })
	mpesaReceiptNumber?: string;

	@Column({ name: 'mpesa_phone_number', nullable: true })
	mpesaPhoneNumber?: string;

	@Column({ name: 'transaction_date', type: 'timestamp', default: () => 'NOW()' })
	transactionDate: Date;

	// Relations
	@ManyToOne(() => Tenant, { eager: false })
	@JoinColumn({ name: 'tenant_id' })
	tenant: Tenant;

	@ManyToOne(() => Invoice, { nullable: true, eager: false })
	@JoinColumn({ name: 'invoice_id' })
	invoice?: Invoice;
}
