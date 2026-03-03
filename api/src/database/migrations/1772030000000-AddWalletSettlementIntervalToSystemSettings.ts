import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWalletSettlementIntervalToSystemSettings1772030000000 implements MigrationInterface {
	name = 'AddWalletSettlementIntervalToSystemSettings1772030000000';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "system_settings" ADD "wallet_settlement_interval_minutes" integer NOT NULL DEFAULT 120`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "system_settings" DROP COLUMN "wallet_settlement_interval_minutes"`,
		);
	}
}
