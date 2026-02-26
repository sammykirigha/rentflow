import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCreditReconciliationWalletTxnType1771940000000 implements MigrationInterface {
	name = 'AddCreditReconciliationWalletTxnType1771940000000';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TYPE "public"."wallet_transactions_type_enum" ADD VALUE IF NOT EXISTS 'credit_reconciliation'`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		// PostgreSQL does not support removing values from an enum type.
		// The value will remain but be unused after rollback.
	}
}
