import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMissingNotificationTypeEnumValues1772155000000 implements MigrationInterface {
	name = 'AddMissingNotificationTypeEnumValues1772155000000';

	public async up(queryRunner: QueryRunner): Promise<void> {
		const newValues = [
			'friendly_reminder',
			'due_today_warning',
			'landlord_escalation',
			'lease_expiry_90',
			'lease_expiry_60',
			'lease_expiry_30',
			'vacancy_alert',
			'statement_sent',
			'owner_report',
		];

		// Must run outside transaction for ALTER TYPE ADD VALUE
		await queryRunner.commitTransaction();

		for (const val of newValues) {
			const exists = await queryRunner.query(`
				SELECT 1 FROM pg_enum
				WHERE enumlabel = $1
				AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'notifications_type_enum')
			`, [val]);

			if (exists.length === 0) {
				await queryRunner.query(`ALTER TYPE "notifications_type_enum" ADD VALUE IF NOT EXISTS '${val}'`);
			}
		}

		await queryRunner.startTransaction();
	}

	public async down(): Promise<void> {
		// PostgreSQL does not support removing enum values
	}
}
