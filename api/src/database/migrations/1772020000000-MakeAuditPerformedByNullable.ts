import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeAuditPerformedByNullable1772020000000 implements MigrationInterface {
    name = 'MakeAuditPerformedByNullable1772020000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Drop the existing FK constraint (references users.user_id with ON DELETE NO ACTION)
        await queryRunner.query(
            `ALTER TABLE "audit_logs" DROP CONSTRAINT "FK_audit_logs_user"`,
        );

        // Make performed_by nullable
        await queryRunner.query(
            `ALTER TABLE "audit_logs" ALTER COLUMN "performed_by" DROP NOT NULL`,
        );

        // Re-add FK constraint allowing NULL and setting to NULL on user delete
        await queryRunner.query(
            `ALTER TABLE "audit_logs" ADD CONSTRAINT "FK_audit_logs_user" FOREIGN KEY ("performed_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE NO ACTION`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop the nullable FK
        await queryRunner.query(
            `ALTER TABLE "audit_logs" DROP CONSTRAINT "FK_audit_logs_user"`,
        );

        // Set any NULL performed_by to a placeholder or fail — for safety, skip rows with NULL
        // In practice, you may need to assign a default user before restoring NOT NULL
        await queryRunner.query(
            `DELETE FROM "audit_logs" WHERE "performed_by" IS NULL`,
        );

        // Restore NOT NULL constraint
        await queryRunner.query(
            `ALTER TABLE "audit_logs" ALTER COLUMN "performed_by" SET NOT NULL`,
        );

        // Re-add FK constraint with original ON DELETE NO ACTION
        await queryRunner.query(
            `ALTER TABLE "audit_logs" ADD CONSTRAINT "FK_audit_logs_user" FOREIGN KEY ("performed_by") REFERENCES "users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
        );
    }
}
