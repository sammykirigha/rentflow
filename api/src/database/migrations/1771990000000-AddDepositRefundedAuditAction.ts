import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDepositRefundedAuditAction1771990000000
	implements MigrationInterface
{
	name = 'AddDepositRefundedAuditAction1771990000000';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TYPE "public"."audit_logs_action_enum" ADD VALUE IF NOT EXISTS 'deposit_refunded'`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		// PostgreSQL does not support removing values from enums.
		// The value will remain but is harmless if unused.
	}
}
