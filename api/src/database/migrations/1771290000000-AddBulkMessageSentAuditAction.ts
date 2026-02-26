import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBulkMessageSentAuditAction1771290000000
	implements MigrationInterface
{
	name = 'AddBulkMessageSentAuditAction1771290000000';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TYPE "public"."audit_logs_action_enum" ADD VALUE IF NOT EXISTS 'bulk_message_sent'`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		// PostgreSQL does not support removing values from enums.
		// The value will remain but is harmless if unused.
	}
}
