import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDepositFieldsToTenants1771960000000 implements MigrationInterface {
	name = 'AddDepositFieldsToTenants1771960000000';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`CREATE TYPE "deposit_status_enum" AS ENUM ('pending', 'collected', 'partially_refunded', 'fully_refunded')`,
		);
		await queryRunner.query(
			`ALTER TABLE "tenants" ADD "deposit_amount" decimal(10,2) NOT NULL DEFAULT 0`,
		);
		await queryRunner.query(
			`ALTER TABLE "tenants" ADD "deposit_status" "deposit_status_enum" NOT NULL DEFAULT 'pending'`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "tenants" DROP COLUMN "deposit_status"`);
		await queryRunner.query(`ALTER TABLE "tenants" DROP COLUMN "deposit_amount"`);
		await queryRunner.query(`DROP TYPE "deposit_status_enum"`);
	}
}
