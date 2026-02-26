import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentReconciliationFields1771430000000 implements MigrationInterface {
	name = 'AddPaymentReconciliationFields1771430000000';

	public async up(queryRunner: QueryRunner): Promise<void> {
		// Make tenant_id nullable
		await queryRunner.query(`ALTER TABLE "payments" ALTER COLUMN "tenant_id" DROP NOT NULL`);

		// Add reconciliation columns
		await queryRunner.query(
			`ALTER TABLE "payments" ADD "needs_reconciliation" boolean NOT NULL DEFAULT false`,
		);
		await queryRunner.query(
			`ALTER TABLE "payments" ADD "reconciliation_note" character varying`,
		);
		await queryRunner.query(
			`ALTER TABLE "payments" ADD "reconciled_at" TIMESTAMP`,
		);
		await queryRunner.query(
			`ALTER TABLE "payments" ADD "reconciled_by" uuid`,
		);

		// Add index on needs_reconciliation for the reconciliation queue query
		await queryRunner.query(
			`CREATE INDEX "IDX_payments_needs_reconciliation" ON "payments" ("needs_reconciliation")`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP INDEX "IDX_payments_needs_reconciliation"`);
		await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "reconciled_by"`);
		await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "reconciled_at"`);
		await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "reconciliation_note"`);
		await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "needs_reconciliation"`);
		await queryRunner.query(`ALTER TABLE "payments" ALTER COLUMN "tenant_id" SET NOT NULL`);
	}
}
