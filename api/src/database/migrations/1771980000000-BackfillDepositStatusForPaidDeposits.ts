import { MigrationInterface, QueryRunner } from 'typeorm';

export class BackfillDepositStatusForPaidDeposits1771980000000 implements MigrationInterface {
	name = 'BackfillDepositStatusForPaidDeposits1771980000000';

	public async up(queryRunner: QueryRunner): Promise<void> {
		// Set deposit_status to 'collected' for tenants whose deposit invoice is paid
		await queryRunner.query(`
			UPDATE tenants t
			SET deposit_status = 'collected'
			FROM invoices i
			WHERE i.tenant_id = t.tenant_id
			  AND i.other_charges_desc LIKE '%Security Deposit%'
			  AND i.status = 'paid'
			  AND t.deposit_status = 'pending'
			  AND t.deposit_amount > 0
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		// Cannot reliably revert — leave as-is
	}
}
