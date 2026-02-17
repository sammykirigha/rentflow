import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWhatsAppNotificationChannel1771260000000 implements MigrationInterface {
	name = 'AddWhatsAppNotificationChannel1771260000000';

	public async up(queryRunner: QueryRunner): Promise<void> {
		// Add new enum values to the notification_channel enum type
		await queryRunner.query(
			`ALTER TYPE "public"."notifications_channel_enum" ADD VALUE IF NOT EXISTS 'whatsapp'`,
		);
		await queryRunner.query(
			`ALTER TYPE "public"."notifications_channel_enum" ADD VALUE IF NOT EXISTS 'all'`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		// PostgreSQL doesn't support removing enum values directly.
		// To revert, you'd need to recreate the enum type without these values.
		// This is intentionally left as a no-op for safety.
	}
}
