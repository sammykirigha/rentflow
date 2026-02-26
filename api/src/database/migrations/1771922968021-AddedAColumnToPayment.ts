import { MigrationInterface, QueryRunner } from "typeorm";

export class AddedAColumnToPayment1771922968021 implements MigrationInterface {
    name = 'AddedAColumnToPayment1771922968021'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Column additions, nullable change, and index were already applied by
        // AddPaymentReconciliationFields1771430000000. Only the audit enum
        // update and FK constraint adjustment remain.

        await queryRunner.query(`ALTER TYPE "public"."audit_logs_action_enum" RENAME TO "audit_logs_action_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."audit_logs_action_enum" AS ENUM('user_created', 'user_updated', 'user_deleted', 'user_suspended', 'user_reactivated', 'user_role_changed', 'property_created', 'property_updated', 'property_deleted', 'unit_created', 'unit_updated', 'tenant_created', 'tenant_updated', 'tenant_vacated', 'tenant_deleted', 'invoice_generated', 'invoice_updated', 'invoice_cancelled', 'invoice_auto_settled', 'invoice_partially_settled', 'payment_received', 'payment_failed', 'payment_reversed', 'stk_push_initiated', 'wallet_credited', 'wallet_debited', 'wallet_refunded', 'penalty_applied', 'expense_created', 'expense_updated', 'expense_completed', 'maintenance_requested', 'maintenance_updated', 'maintenance_resolved', 'notification_sent', 'reminder_sent', 'bulk_reminder_sent', 'bulk_message_sent', 'settings_updated', 'role_created', 'role_updated', 'role_deleted', 'payment_reconciled', 'wallet_auto_settlement_completed', 'receipt_generated', 'created', 'updated', 'deleted')`);
        await queryRunner.query(`ALTER TABLE "audit_logs" ALTER COLUMN "action" TYPE "public"."audit_logs_action_enum" USING "action"::"text"::"public"."audit_logs_action_enum"`);
        await queryRunner.query(`DROP TYPE "public"."audit_logs_action_enum_old"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "FK_9109b53fca5cef7720aca72974d"`);
        await queryRunner.query(`ALTER TABLE "payments" ADD CONSTRAINT "FK_9109b53fca5cef7720aca72974d" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "FK_9109b53fca5cef7720aca72974d"`);
        await queryRunner.query(`ALTER TABLE "payments" ALTER COLUMN "tenant_id" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "payments" ADD CONSTRAINT "FK_9109b53fca5cef7720aca72974d" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`CREATE TYPE "public"."audit_logs_action_enum_old" AS ENUM('user_created', 'user_updated', 'user_deleted', 'user_suspended', 'user_reactivated', 'user_role_changed', 'property_created', 'property_updated', 'property_deleted', 'unit_created', 'unit_updated', 'tenant_created', 'tenant_updated', 'tenant_vacated', 'tenant_deleted', 'invoice_generated', 'invoice_updated', 'invoice_cancelled', 'invoice_auto_settled', 'invoice_partially_settled', 'payment_received', 'payment_failed', 'payment_reversed', 'stk_push_initiated', 'wallet_credited', 'wallet_debited', 'wallet_refunded', 'penalty_applied', 'expense_created', 'expense_updated', 'expense_completed', 'maintenance_requested', 'maintenance_updated', 'maintenance_resolved', 'notification_sent', 'reminder_sent', 'bulk_reminder_sent', 'settings_updated', 'role_created', 'role_updated', 'role_deleted', 'receipt_generated', 'created', 'updated', 'deleted', 'bulk_message_sent')`);
        await queryRunner.query(`ALTER TABLE "audit_logs" ALTER COLUMN "action" TYPE "public"."audit_logs_action_enum_old" USING "action"::"text"::"public"."audit_logs_action_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."audit_logs_action_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."audit_logs_action_enum_old" RENAME TO "audit_logs_action_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_payments_needs_reconciliation"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "reconciled_by"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "reconciled_at"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "reconciliation_note"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "needs_reconciliation"`);
    }

}
