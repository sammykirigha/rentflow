import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMissingAuditActionEnumValues1772010000000 implements MigrationInterface {
    name = 'AddMissingAuditActionEnumValues1772010000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TYPE "public"."audit_logs_action_enum" ADD VALUE IF NOT EXISTS 'stk_push_callback_success'`,
        );
        await queryRunner.query(
            `ALTER TYPE "public"."audit_logs_action_enum" ADD VALUE IF NOT EXISTS 'stk_push_callback_failed'`,
        );
        await queryRunner.query(
            `ALTER TYPE "public"."audit_logs_action_enum" ADD VALUE IF NOT EXISTS 'c2b_payment_received'`,
        );
        await queryRunner.query(
            `ALTER TYPE "public"."audit_logs_action_enum" ADD VALUE IF NOT EXISTS 'c2b_payment_unmatched'`,
        );
        await queryRunner.query(
            `ALTER TYPE "public"."audit_logs_action_enum" ADD VALUE IF NOT EXISTS 'c2b_urls_registered'`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // PostgreSQL does not support removing values from an enum type
    }
}
