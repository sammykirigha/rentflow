import { MigrationInterface, QueryRunner } from "typeorm";

export class AddedColumn1771253441805 implements MigrationInterface {
    name = 'AddedColumn1771253441805'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."audit_logs_action_enum" RENAME TO "audit_logs_action_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."audit_logs_action_enum" AS ENUM('user_created', 'user_updated', 'user_deleted', 'user_suspended', 'user_reactivated', 'user_role_changed', 'property_created', 'property_updated', 'property_deleted', 'unit_created', 'unit_updated', 'tenant_created', 'tenant_updated', 'tenant_vacated', 'tenant_deleted', 'invoice_generated', 'invoice_updated', 'invoice_cancelled', 'invoice_auto_settled', 'invoice_partially_settled', 'payment_received', 'payment_failed', 'payment_reversed', 'stk_push_initiated', 'wallet_credited', 'wallet_debited', 'wallet_refunded', 'penalty_applied', 'expense_created', 'expense_updated', 'expense_completed', 'maintenance_requested', 'maintenance_updated', 'maintenance_resolved', 'notification_sent', 'reminder_sent', 'bulk_reminder_sent', 'settings_updated', 'role_created', 'role_updated', 'role_deleted', 'receipt_generated', 'created', 'updated', 'deleted')`);
        await queryRunner.query(`ALTER TABLE "audit_logs" ALTER COLUMN "action" TYPE "public"."audit_logs_action_enum" USING "action"::"text"::"public"."audit_logs_action_enum"`);
        await queryRunner.query(`DROP TYPE "public"."audit_logs_action_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."audit_logs_action_enum_old" AS ENUM('user_created', 'user_updated', 'user_deleted', 'user_suspended', 'user_reactivated', 'user_role_changed', 'property_created', 'property_updated', 'property_deleted', 'unit_created', 'unit_updated', 'tenant_created', 'tenant_updated', 'tenant_vacated', 'invoice_generated', 'invoice_updated', 'invoice_cancelled', 'invoice_auto_settled', 'invoice_partially_settled', 'payment_received', 'payment_failed', 'payment_reversed', 'stk_push_initiated', 'wallet_credited', 'wallet_debited', 'wallet_refunded', 'penalty_applied', 'expense_created', 'expense_updated', 'expense_completed', 'maintenance_requested', 'maintenance_updated', 'maintenance_resolved', 'notification_sent', 'reminder_sent', 'bulk_reminder_sent', 'settings_updated', 'role_created', 'role_updated', 'role_deleted', 'receipt_generated', 'created', 'updated', 'deleted')`);
        await queryRunner.query(`ALTER TABLE "audit_logs" ALTER COLUMN "action" TYPE "public"."audit_logs_action_enum_old" USING "action"::"text"::"public"."audit_logs_action_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."audit_logs_action_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."audit_logs_action_enum_old" RENAME TO "audit_logs_action_enum"`);
    }

}
