import { Payment, PaymentMethod, PaymentStatus } from '@/modules/payments/entities/payment.entity';
import { DataSource } from 'typeorm';

// Paybill numbers match the seeded properties:
// Sunrise Apartments = 123456, Kilimani Heights = 789012, South B Gardens = 345678
//
// 2 payments use the tenant's own phone (auto-match works):
// Mary Njeri       0711223344  → Sunrise Apts, A-101
// David Mwangi     0744556677  → Sunrise Apts, B-201
//
// 2 payments use a different phone (no auto-match — paid from someone else's phone):
// James Mutua's payment from his wife's phone 0712999888
// Sarah Wambui's payment from a friend's phone 0798111222
const RECONCILIATION_PAYMENTS = [
	{
		amount: 25000,
		method: PaymentMethod.MPESA_PAYBILL,
		mpesaReceiptNumber: 'SHK3A7B9X1',
		mpesaPhoneNumber: '0711223344',       // Mary Njeri's own phone — auto-match works
		mpesaPaybillNumber: '123456',         // Sunrise Apartments
		mpesaAccountReference: 'A-10',        // Typo — meant A-101
	},
	{
		amount: 18000,
		method: PaymentMethod.MPESA_PAYBILL,
		mpesaReceiptNumber: 'RKL9C2D4F8',
		mpesaPhoneNumber: '0712999888',       // Unknown phone — James Mutua paid from wife's number
		mpesaPaybillNumber: '345678',         // South B Gardens
		mpesaAccountReference: 'G01',         // Missing dash — meant G-01
	},
	{
		amount: 35000,
		method: PaymentMethod.MPESA_PAYBILL,
		mpesaReceiptNumber: 'QWE5G1H3J6',
		mpesaPhoneNumber: '0798111222',       // Unknown phone — Sarah Wambui paid from friend's number
		mpesaPaybillNumber: '789012',         // Kilimani Heights
		mpesaAccountReference: '10',          // Wrong format — meant 101
	},
	{
		amount: 12500,
		method: PaymentMethod.MPESA_STK_PUSH,
		mpesaReceiptNumber: 'TXN8K4L6M2',
		mpesaPhoneNumber: '0744556677',       // David Mwangi's own phone — auto-match works
		mpesaPaybillNumber: '123456',         // Sunrise Apartments
		mpesaAccountReference: 'B-201-RENT',  // Extra suffix — meant B-201
	},
];

export class ReconciliationPaymentsSeed {
	public async run(dataSource: DataSource): Promise<void> {
		const paymentRepo = dataSource.getRepository(Payment);

		console.log('Seeding reconciliation payments...');

		for (const data of RECONCILIATION_PAYMENTS) {
			const existing = await paymentRepo.findOne({
				where: { mpesaReceiptNumber: data.mpesaReceiptNumber },
			});

			if (existing) {
				// Update existing record to ensure all fields match seed data
				const needsUpdate =
					existing.mpesaPhoneNumber !== data.mpesaPhoneNumber ||
					existing.mpesaAccountReference !== data.mpesaAccountReference ||
					existing.mpesaPaybillNumber !== data.mpesaPaybillNumber;

				if (needsUpdate) {
					await paymentRepo.update(
						{ paymentId: existing.paymentId },
						{
							mpesaPhoneNumber: data.mpesaPhoneNumber,
							mpesaAccountReference: data.mpesaAccountReference,
							mpesaPaybillNumber: data.mpesaPaybillNumber,
						},
					);
					console.log(`  Updated payment: ${data.mpesaReceiptNumber}`);
				} else {
					console.log(`  Payment already up to date: ${data.mpesaReceiptNumber}`);
				}
				continue;
			}

			const payment = paymentRepo.create({
				tenantId: undefined,
				invoiceId: undefined,
				amount: data.amount,
				method: data.method,
				status: PaymentStatus.COMPLETED,
				mpesaReceiptNumber: data.mpesaReceiptNumber,
				mpesaPhoneNumber: data.mpesaPhoneNumber,
				mpesaAccountReference: data.mpesaAccountReference,
				mpesaPaybillNumber: data.mpesaPaybillNumber,
				transactionDate: new Date(),
				needsReconciliation: true,
			});

			await paymentRepo.save(payment);
			console.log(
				`  Created reconciliation payment: ${data.mpesaReceiptNumber} — ` +
				`KES ${data.amount.toLocaleString()} from ${data.mpesaPhoneNumber} ` +
				`(Paybill: ${data.mpesaPaybillNumber}, Acc: ${data.mpesaAccountReference})`,
			);
		}

		console.log('Reconciliation payments seeding completed!');
	}
}
