import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMissingAuditEnumValues1772150000000 implements MigrationInterface {
	name = 'AddMissingAuditEnumValues1772150000000';

	public async up(queryRunner: QueryRunner): Promise<void> {
		// New audit action enum values
		const newActions = [
			'invoice_disputed',
			'admin_stk_push_initiated',
			'organization_created',
			'organization_updated',
			'organization_suspended',
			'organization_reactivated',
			'subscription_created',
			'subscription_updated',
			'subscription_cancelled',
			'platform_config_updated',
			'impersonation_started',
			'impersonation_ended',
			'lease_expiry_reminder',
			'lease_auto_notice_period',
			'lease_auto_vacated',
			'vacancy_alert_sent',
			'landlord_escalation',
			'checklist_item_completed',
			'deposit_deduction_added',
			'meter_reading_created',
			'meter_reading_updated',
			'rent_escalation_created',
			'rent_escalation_applied',
			'rent_escalation_cancelled',
			'owner_report_generated',
			'statement_generated',
		];

		// Must run outside transaction for ALTER TYPE ADD VALUE
		await queryRunner.commitTransaction();

		for (const val of newActions) {
			const exists = await queryRunner.query(`
				SELECT 1 FROM pg_enum
				WHERE enumlabel = $1
				AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'audit_logs_action_enum')
			`, [val]);

			if (exists.length === 0) {
				await queryRunner.query(`ALTER TYPE "audit_logs_action_enum" ADD VALUE IF NOT EXISTS '${val}'`);
			}
		}

		// New audit target type enum values
		const newTargetTypes = [
			'organization',
			'subscription',
			'platform_config',
			'checklist',
			'meter_reading',
			'rent_escalation',
			'report',
			'statement',
		];

		for (const val of newTargetTypes) {
			const exists = await queryRunner.query(`
				SELECT 1 FROM pg_enum
				WHERE enumlabel = $1
				AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'audit_logs_targettype_enum')
			`, [val]);

			if (exists.length === 0) {
				await queryRunner.query(`ALTER TYPE "audit_logs_targettype_enum" ADD VALUE IF NOT EXISTS '${val}'`);
			}
		}

		await queryRunner.startTransaction();
	}

	public async down(): Promise<void> {
		// PostgreSQL does not support removing enum values
	}
}
