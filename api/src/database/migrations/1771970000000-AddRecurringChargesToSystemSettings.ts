import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRecurringChargesToSystemSettings1771970000000 implements MigrationInterface {
	name = 'AddRecurringChargesToSystemSettings1771970000000';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "system_settings" ADD "recurring_charges" jsonb NOT NULL DEFAULT '[]'::jsonb`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "system_settings" DROP COLUMN "recurring_charges"`);
	}
}
