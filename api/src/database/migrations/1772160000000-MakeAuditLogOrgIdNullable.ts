import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeAuditLogOrgIdNullable1772160000000 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "audit_logs" ALTER COLUMN "organization_id" DROP NOT NULL`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "audit_logs" ALTER COLUMN "organization_id" SET NOT NULL`,
		);
	}
}
