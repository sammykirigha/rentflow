import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTenantIdDocumentFields1772050000000 implements MigrationInterface {
	name = 'AddTenantIdDocumentFields1772050000000';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "tenants" ADD "id_number" varchar`,
		);
		await queryRunner.query(
			`ALTER TABLE "tenants" ADD "id_copy_key" varchar`,
		);
		await queryRunner.query(
			`ALTER TABLE "tenants" ADD "kra_certificate_key" varchar`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "tenants" DROP COLUMN "kra_certificate_key"`);
		await queryRunner.query(`ALTER TABLE "tenants" DROP COLUMN "id_copy_key"`);
		await queryRunner.query(`ALTER TABLE "tenants" DROP COLUMN "id_number"`);
	}
}
