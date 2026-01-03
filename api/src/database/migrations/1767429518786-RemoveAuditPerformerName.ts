import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveAuditPerformerName1767429518786 implements MigrationInterface {
    name = 'RemoveAuditPerformerName1767429518786'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN "performer_name"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "audit_logs" ADD "performer_name" character varying`);
    }

}
