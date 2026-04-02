import { OrgScopedEntity } from '@/database/org-scoped.entity';
import { Invoice } from '@/modules/invoices/entities/invoice.entity';
import {
	Column,
	Entity,
	JoinColumn,
	OneToOne,
	PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('receipts')
export class Receipt extends OrgScopedEntity<Receipt> {
	@PrimaryGeneratedColumn('uuid', { name: 'receipt_id' })
	receiptId: string;

	@Column({ name: 'receipt_number', unique: true })
	receiptNumber: string;

	@Column({ name: 'invoice_id', type: 'uuid', unique: true })
	invoiceId: string;

	@Column({ name: 'total_paid', type: 'decimal', precision: 10, scale: 2 })
	totalPaid: number;

	@Column({ name: 'pdf_url', nullable: true })
	pdfUrl?: string;

	// Relations
	@OneToOne(() => Invoice, { eager: false })
	@JoinColumn({ name: 'invoice_id' })
	invoice: Invoice;
}
