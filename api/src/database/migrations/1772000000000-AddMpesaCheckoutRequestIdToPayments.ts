import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMpesaCheckoutRequestIdToPayments1772000000000 implements MigrationInterface {
	name = 'AddMpesaCheckoutRequestIdToPayments1772000000000';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "payments" ADD "mpesa_checkout_request_id" character varying UNIQUE`,
		);
		await queryRunner.query(
			`CREATE INDEX "idx_payments_mpesa_checkout" ON "payments" ("mpesa_checkout_request_id") WHERE "mpesa_checkout_request_id" IS NOT NULL`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP INDEX "idx_payments_mpesa_checkout"`);
		await queryRunner.query(
			`ALTER TABLE "payments" DROP COLUMN "mpesa_checkout_request_id"`,
		);
	}
}
