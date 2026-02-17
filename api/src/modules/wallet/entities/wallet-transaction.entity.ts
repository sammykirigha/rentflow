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

export enum WalletTxnType {
	CREDIT = 'credit',
	DEBIT_INVOICE = 'debit_invoice',
	DEBIT_PENALTY = 'debit_penalty',
	REFUND = 'refund',
}

@Entity('wallet_transactions')
@Index(['tenantId'])
export class WalletTransaction extends AbstractEntity<WalletTransaction> {
	@PrimaryGeneratedColumn('uuid', { name: 'wallet_transaction_id' })
	walletTransactionId: string;

	@Column({ name: 'tenant_id', type: 'uuid' })
	tenantId: string;

	@Column({ type: 'enum', enum: WalletTxnType })
	type: WalletTxnType;

	@Column({ type: 'decimal', precision: 10, scale: 2 })
	amount: number;

	@Column({ name: 'balance_before', type: 'decimal', precision: 10, scale: 2 })
	balanceBefore: number;

	@Column({ name: 'balance_after', type: 'decimal', precision: 10, scale: 2 })
	balanceAfter: number;

	@Column({ nullable: true })
	reference?: string;

	@Column({ nullable: true })
	description?: string;

	// Relations
	@ManyToOne(() => Tenant, { eager: false })
	@JoinColumn({ name: 'tenant_id' })
	tenant: Tenant;
}
