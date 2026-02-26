import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1771270000000 implements MigrationInterface {
  name = 'InitialSchema1771270000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── Enums ────────────────────────────────────────────
    await queryRunner.query(
      `CREATE TYPE "public"."permissions_resource_enum" AS ENUM('users', 'properties', 'units', 'tenants', 'invoices', 'payments', 'wallet', 'expenses', 'vendors', 'maintenance', 'communications', 'reports', 'settings')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."permissions_action_enum" AS ENUM('create', 'read', 'update', 'delete', 'export')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_status_enum" AS ENUM('PENDING', 'ACTIVE', 'INACTIVE', 'SUSPENDED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."audit_logs_action_enum" AS ENUM('user_created', 'user_updated', 'user_deleted', 'user_suspended', 'user_reactivated', 'user_role_changed', 'property_created', 'property_updated', 'property_deleted', 'unit_created', 'unit_updated', 'tenant_created', 'tenant_updated', 'tenant_vacated', 'tenant_deleted', 'invoice_generated', 'invoice_updated', 'invoice_cancelled', 'invoice_auto_settled', 'invoice_partially_settled', 'payment_received', 'payment_failed', 'payment_reversed', 'stk_push_initiated', 'wallet_credited', 'wallet_debited', 'wallet_refunded', 'penalty_applied', 'expense_created', 'expense_updated', 'expense_completed', 'maintenance_requested', 'maintenance_updated', 'maintenance_resolved', 'notification_sent', 'reminder_sent', 'bulk_reminder_sent', 'settings_updated', 'role_created', 'role_updated', 'role_deleted', 'receipt_generated', 'created', 'updated', 'deleted')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."audit_logs_targettype_enum" AS ENUM('user', 'property', 'unit', 'tenant', 'invoice', 'payment', 'wallet', 'receipt', 'expense', 'vendor', 'maintenance', 'notification', 'settings', 'role', 'permission')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."units_unit_type_enum" AS ENUM('studio', 'bedsitter', 'one_bedroom', 'two_bedroom', 'three_bedroom')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."tenants_status_enum" AS ENUM('active', 'notice_period', 'vacated')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."invoices_status_enum" AS ENUM('paid', 'partially_paid', 'unpaid', 'overdue', 'cancelled')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."payments_method_enum" AS ENUM('mpesa_paybill', 'mpesa_stk_push', 'wallet_deduction', 'manual')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."payments_status_enum" AS ENUM('pending', 'completed', 'failed', 'reversed')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."wallet_transactions_type_enum" AS ENUM('credit', 'debit_invoice', 'debit_penalty', 'refund')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."expenses_category_enum" AS ENUM('plumbing', 'roofing', 'electrical', 'painting', 'security', 'general_maintenance', 'structural', 'other')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."expenses_priority_enum" AS ENUM('low', 'medium', 'high', 'urgent')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."expenses_status_enum" AS ENUM('pending', 'approved', 'in_progress', 'completed', 'cancelled')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."maintenance_requests_category_enum" AS ENUM('plumbing', 'roofing', 'electrical', 'painting', 'security', 'general_maintenance', 'structural', 'other')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."maintenance_requests_priority_enum" AS ENUM('low', 'medium', 'high', 'urgent')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."maintenance_requests_status_enum" AS ENUM('pending', 'approved', 'in_progress', 'completed', 'cancelled')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notifications_type_enum" AS ENUM('invoice_sent', 'receipt_sent', 'payment_reminder', 'penalty_notice', 'maintenance_update', 'lease_renewal', 'general', 'welcome_credentials')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notifications_channel_enum" AS ENUM('sms', 'email', 'both', 'whatsapp', 'all')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notifications_status_enum" AS ENUM('pending', 'sent', 'failed')`,
    );

    // ─── Tables ───────────────────────────────────────────

    // Permissions
    await queryRunner.query(
      `CREATE TABLE "permissions" (
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "permission_id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "resource" "public"."permissions_resource_enum" NOT NULL,
        "action" "public"."permissions_action_enum" NOT NULL,
        "name" character varying NOT NULL,
        "description" text,
        CONSTRAINT "PK_permissions" PRIMARY KEY ("permission_id")
      )`,
    );

    // Roles
    await queryRunner.query(
      `CREATE TABLE "roles" (
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "role_id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "description" text,
        "is_system_role" boolean NOT NULL DEFAULT false,
        "is_admin_role" boolean NOT NULL DEFAULT true,
        CONSTRAINT "UQ_roles_name" UNIQUE ("name"),
        CONSTRAINT "PK_roles" PRIMARY KEY ("role_id")
      )`,
    );
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_roles_name" ON "roles" ("name")`);

    // Users
    await queryRunner.query(
      `CREATE TABLE "users" (
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "user_id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "role_id" uuid,
        "email" character varying NOT NULL,
        "password" character varying,
        "firstName" character varying,
        "lastName" character varying,
        "phone" character varying,
        "avatar_url" character varying,
        "status" "public"."users_status_enum" NOT NULL DEFAULT 'ACTIVE',
        "phone_verified" boolean NOT NULL DEFAULT false,
        "email_verified" boolean NOT NULL DEFAULT false,
        "reset_password_token" character varying,
        "reset_password_expires" TIMESTAMP,
        "suspension_reason" text,
        "last_login_at" TIMESTAMP,
        "refresh_token" character varying,
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users" PRIMARY KEY ("user_id")
      )`,
    );
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_users_email" ON "users" ("email")`);

    // Audit Logs
    await queryRunner.query(
      `CREATE TABLE "audit_logs" (
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "audit_id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "action" "public"."audit_logs_action_enum" NOT NULL,
        "performed_by" uuid NOT NULL,
        "targetType" "public"."audit_logs_targettype_enum" NOT NULL,
        "target_id" character varying,
        "details" text NOT NULL,
        "ip_address" character varying,
        "metadata" jsonb,
        CONSTRAINT "PK_audit_logs" PRIMARY KEY ("audit_id")
      )`,
    );

    // Properties
    await queryRunner.query(
      `CREATE TABLE "properties" (
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "property_id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "location" character varying NOT NULL,
        "address" character varying,
        "total_units" integer NOT NULL DEFAULT '0',
        "paybill_number" character varying,
        "logo_url" character varying,
        "is_active" boolean NOT NULL DEFAULT true,
        CONSTRAINT "PK_properties" PRIMARY KEY ("property_id")
      )`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_properties_is_active" ON "properties" ("is_active")`);
    await queryRunner.query(`CREATE INDEX "IDX_properties_name" ON "properties" ("name")`);

    // Units
    await queryRunner.query(
      `CREATE TABLE "units" (
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "unit_id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "unit_number" character varying NOT NULL,
        "property_id" uuid NOT NULL,
        "rent_amount" numeric(10,2) NOT NULL,
        "unit_type" "public"."units_unit_type_enum" NOT NULL DEFAULT 'one_bedroom',
        "is_occupied" boolean NOT NULL DEFAULT false,
        CONSTRAINT "UQ_units_property_unit_number" UNIQUE ("property_id", "unit_number"),
        CONSTRAINT "PK_units" PRIMARY KEY ("unit_id")
      )`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_units_property_id" ON "units" ("property_id")`);

    // Tenants
    await queryRunner.query(
      `CREATE TABLE "tenants" (
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "tenant_id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "unit_id" uuid,
        "wallet_balance" numeric(10,2) NOT NULL DEFAULT '0',
        "status" "public"."tenants_status_enum" NOT NULL DEFAULT 'active',
        "lease_start" TIMESTAMP NOT NULL,
        "lease_end" TIMESTAMP,
        CONSTRAINT "UQ_tenants_user_id" UNIQUE ("user_id"),
        CONSTRAINT "UQ_tenants_unit_id" UNIQUE ("unit_id"),
        CONSTRAINT "PK_tenants" PRIMARY KEY ("tenant_id")
      )`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_tenants_status" ON "tenants" ("status")`);

    // Invoices
    await queryRunner.query(
      `CREATE TABLE "invoices" (
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "invoice_id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "invoice_number" character varying NOT NULL,
        "tenant_id" uuid NOT NULL,
        "billing_month" TIMESTAMP NOT NULL,
        "rent_amount" numeric(10,2) NOT NULL,
        "water_charge" numeric(10,2) NOT NULL DEFAULT '0',
        "electricity_charge" numeric(10,2) NOT NULL DEFAULT '0',
        "other_charges" numeric(10,2) NOT NULL DEFAULT '0',
        "other_charges_desc" character varying,
        "subtotal" numeric(10,2) NOT NULL,
        "penalty_amount" numeric(10,2) NOT NULL DEFAULT '0',
        "total_amount" numeric(10,2) NOT NULL,
        "amount_paid" numeric(10,2) NOT NULL DEFAULT '0',
        "balance_due" numeric(10,2) NOT NULL,
        "status" "public"."invoices_status_enum" NOT NULL DEFAULT 'unpaid',
        "due_date" TIMESTAMP NOT NULL,
        "paid_at" TIMESTAMP,
        "penalty_applied_at" TIMESTAMP,
        "notes" character varying,
        CONSTRAINT "UQ_invoices_invoice_number" UNIQUE ("invoice_number"),
        CONSTRAINT "PK_invoices" PRIMARY KEY ("invoice_id")
      )`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_invoices_due_date" ON "invoices" ("due_date")`);
    await queryRunner.query(`CREATE INDEX "IDX_invoices_status" ON "invoices" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_invoices_billing_month" ON "invoices" ("billing_month")`);
    await queryRunner.query(`CREATE INDEX "IDX_invoices_tenant_id" ON "invoices" ("tenant_id")`);

    // Payments
    await queryRunner.query(
      `CREATE TABLE "payments" (
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "payment_id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "invoice_id" uuid,
        "amount" numeric(10,2) NOT NULL,
        "method" "public"."payments_method_enum" NOT NULL,
        "status" "public"."payments_status_enum" NOT NULL DEFAULT 'pending',
        "mpesa_receipt_number" character varying,
        "mpesa_phone_number" character varying,
        "transaction_date" TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT "UQ_payments_mpesa_receipt" UNIQUE ("mpesa_receipt_number"),
        CONSTRAINT "PK_payments" PRIMARY KEY ("payment_id")
      )`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_payments_mpesa_receipt" ON "payments" ("mpesa_receipt_number")`);
    await queryRunner.query(`CREATE INDEX "IDX_payments_invoice_id" ON "payments" ("invoice_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_payments_tenant_id" ON "payments" ("tenant_id")`);

    // Receipts
    await queryRunner.query(
      `CREATE TABLE "receipts" (
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "receipt_id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "receipt_number" character varying NOT NULL,
        "invoice_id" uuid NOT NULL,
        "total_paid" numeric(10,2) NOT NULL,
        "pdf_url" character varying,
        CONSTRAINT "UQ_receipts_receipt_number" UNIQUE ("receipt_number"),
        CONSTRAINT "UQ_receipts_invoice_id" UNIQUE ("invoice_id"),
        CONSTRAINT "PK_receipts" PRIMARY KEY ("receipt_id")
      )`,
    );

    // System Settings
    await queryRunner.query(
      `CREATE TABLE "system_settings" (
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "system_setting_id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "platform_name" character varying NOT NULL DEFAULT 'RentFlow',
        "support_email" character varying NOT NULL DEFAULT 'support@rentflow.co.ke',
        "app_logo" character varying(500),
        "app_favicon" character varying(500),
        "contact_phone" character varying(20),
        "contact_address" text,
        "max_file_upload_size" integer NOT NULL DEFAULT '10',
        "allowed_file_types" text,
        "allow_signup" boolean NOT NULL DEFAULT false,
        "require_verification" boolean NOT NULL DEFAULT false,
        "email_notifications" boolean NOT NULL DEFAULT true,
        "sms_notifications" boolean NOT NULL DEFAULT true,
        "admin_alerts" boolean NOT NULL DEFAULT true,
        CONSTRAINT "PK_system_settings" PRIMARY KEY ("system_setting_id")
      )`,
    );

    // Wallet Transactions
    await queryRunner.query(
      `CREATE TABLE "wallet_transactions" (
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "wallet_transaction_id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "type" "public"."wallet_transactions_type_enum" NOT NULL,
        "amount" numeric(10,2) NOT NULL,
        "balance_before" numeric(10,2) NOT NULL,
        "balance_after" numeric(10,2) NOT NULL,
        "reference" character varying,
        "description" character varying,
        CONSTRAINT "PK_wallet_transactions" PRIMARY KEY ("wallet_transaction_id")
      )`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_wallet_transactions_tenant_id" ON "wallet_transactions" ("tenant_id")`);

    // Vendors
    await queryRunner.query(
      `CREATE TABLE "vendors" (
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "vendor_id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "phone" character varying NOT NULL,
        "email" character varying,
        "specialty" character varying NOT NULL,
        "rating" numeric(2,1),
        "is_active" boolean NOT NULL DEFAULT true,
        CONSTRAINT "PK_vendors" PRIMARY KEY ("vendor_id")
      )`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_vendors_is_active" ON "vendors" ("is_active")`);
    await queryRunner.query(`CREATE INDEX "IDX_vendors_specialty" ON "vendors" ("specialty")`);
    await queryRunner.query(`CREATE INDEX "IDX_vendors_name" ON "vendors" ("name")`);

    // Expenses
    await queryRunner.query(
      `CREATE TABLE "expenses" (
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "expense_id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "property_id" uuid NOT NULL,
        "category" "public"."expenses_category_enum" NOT NULL,
        "priority" "public"."expenses_priority_enum" NOT NULL DEFAULT 'medium',
        "description" character varying NOT NULL,
        "amount" numeric(10,2) NOT NULL,
        "vendor_id" uuid,
        "status" "public"."expenses_status_enum" NOT NULL DEFAULT 'pending',
        "scheduled_date" TIMESTAMP,
        "completed_date" TIMESTAMP,
        "notes" character varying,
        "photos" text,
        CONSTRAINT "PK_expenses" PRIMARY KEY ("expense_id")
      )`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_expenses_status" ON "expenses" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_expenses_category" ON "expenses" ("category")`);
    await queryRunner.query(`CREATE INDEX "IDX_expenses_property_id" ON "expenses" ("property_id")`);

    // Maintenance Requests
    await queryRunner.query(
      `CREATE TABLE "maintenance_requests" (
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "maintenance_request_id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "description" character varying NOT NULL,
        "category" "public"."maintenance_requests_category_enum" NOT NULL,
        "priority" "public"."maintenance_requests_priority_enum" NOT NULL DEFAULT 'medium',
        "photos" text,
        "status" "public"."maintenance_requests_status_enum" NOT NULL DEFAULT 'pending',
        "resolved_at" TIMESTAMP,
        CONSTRAINT "PK_maintenance_requests" PRIMARY KEY ("maintenance_request_id")
      )`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_maintenance_requests_status" ON "maintenance_requests" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_maintenance_requests_tenant_id" ON "maintenance_requests" ("tenant_id")`);

    // Notifications
    await queryRunner.query(
      `CREATE TABLE "notifications" (
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "notification_id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "invoice_id" uuid,
        "type" "public"."notifications_type_enum" NOT NULL,
        "channel" "public"."notifications_channel_enum" NOT NULL,
        "subject" character varying,
        "message" text NOT NULL,
        "status" "public"."notifications_status_enum" NOT NULL DEFAULT 'pending',
        "retry_count" integer NOT NULL DEFAULT '0',
        "sent_at" TIMESTAMP,
        "delivered_at" TIMESTAMP,
        "fail_reason" character varying,
        CONSTRAINT "PK_notifications" PRIMARY KEY ("notification_id")
      )`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_notifications_sent_at" ON "notifications" ("sent_at")`);
    await queryRunner.query(`CREATE INDEX "IDX_notifications_type" ON "notifications" ("type")`);
    await queryRunner.query(`CREATE INDEX "IDX_notifications_tenant_id" ON "notifications" ("tenant_id")`);

    // Role-Permission join table
    await queryRunner.query(
      `CREATE TABLE "role_permissions" (
        "role_id" uuid NOT NULL,
        "permission_id" uuid NOT NULL,
        CONSTRAINT "PK_role_permissions" PRIMARY KEY ("role_id", "permission_id")
      )`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_role_permissions_role_id" ON "role_permissions" ("role_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_role_permissions_permission_id" ON "role_permissions" ("permission_id")`);

    // ─── Foreign Keys ─────────────────────────────────────

    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_users_role" FOREIGN KEY ("role_id") REFERENCES "roles"("role_id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ADD CONSTRAINT "FK_audit_logs_user" FOREIGN KEY ("performed_by") REFERENCES "users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "units" ADD CONSTRAINT "FK_units_property" FOREIGN KEY ("property_id") REFERENCES "properties"("property_id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenants" ADD CONSTRAINT "FK_tenants_user" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenants" ADD CONSTRAINT "FK_tenants_unit" FOREIGN KEY ("unit_id") REFERENCES "units"("unit_id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoices" ADD CONSTRAINT "FK_invoices_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD CONSTRAINT "FK_payments_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD CONSTRAINT "FK_payments_invoice" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("invoice_id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "receipts" ADD CONSTRAINT "FK_receipts_invoice" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("invoice_id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallet_transactions" ADD CONSTRAINT "FK_wallet_transactions_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "expenses" ADD CONSTRAINT "FK_expenses_property" FOREIGN KEY ("property_id") REFERENCES "properties"("property_id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "expenses" ADD CONSTRAINT "FK_expenses_vendor" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("vendor_id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "maintenance_requests" ADD CONSTRAINT "FK_maintenance_requests_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD CONSTRAINT "FK_notifications_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD CONSTRAINT "FK_notifications_invoice" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("invoice_id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_role_permissions_role" FOREIGN KEY ("role_id") REFERENCES "roles"("role_id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_role_permissions_permission" FOREIGN KEY ("permission_id") REFERENCES "permissions"("permission_id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ─── Drop Foreign Keys ────────────────────────────────
    await queryRunner.query(`ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_role_permissions_permission"`);
    await queryRunner.query(`ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_role_permissions_role"`);
    await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_notifications_invoice"`);
    await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_notifications_tenant"`);
    await queryRunner.query(`ALTER TABLE "maintenance_requests" DROP CONSTRAINT "FK_maintenance_requests_tenant"`);
    await queryRunner.query(`ALTER TABLE "expenses" DROP CONSTRAINT "FK_expenses_vendor"`);
    await queryRunner.query(`ALTER TABLE "expenses" DROP CONSTRAINT "FK_expenses_property"`);
    await queryRunner.query(`ALTER TABLE "wallet_transactions" DROP CONSTRAINT "FK_wallet_transactions_tenant"`);
    await queryRunner.query(`ALTER TABLE "receipts" DROP CONSTRAINT "FK_receipts_invoice"`);
    await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "FK_payments_invoice"`);
    await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "FK_payments_tenant"`);
    await queryRunner.query(`ALTER TABLE "invoices" DROP CONSTRAINT "FK_invoices_tenant"`);
    await queryRunner.query(`ALTER TABLE "tenants" DROP CONSTRAINT "FK_tenants_unit"`);
    await queryRunner.query(`ALTER TABLE "tenants" DROP CONSTRAINT "FK_tenants_user"`);
    await queryRunner.query(`ALTER TABLE "units" DROP CONSTRAINT "FK_units_property"`);
    await queryRunner.query(`ALTER TABLE "audit_logs" DROP CONSTRAINT "FK_audit_logs_user"`);
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_users_role"`);

    // ─── Drop Tables ──────────────────────────────────────
    await queryRunner.query(`DROP INDEX "public"."IDX_role_permissions_permission_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_role_permissions_role_id"`);
    await queryRunner.query(`DROP TABLE "role_permissions"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_notifications_tenant_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_notifications_type"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_notifications_sent_at"`);
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_maintenance_requests_tenant_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_maintenance_requests_status"`);
    await queryRunner.query(`DROP TABLE "maintenance_requests"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_expenses_property_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_expenses_category"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_expenses_status"`);
    await queryRunner.query(`DROP TABLE "expenses"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_vendors_name"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_vendors_specialty"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_vendors_is_active"`);
    await queryRunner.query(`DROP TABLE "vendors"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_wallet_transactions_tenant_id"`);
    await queryRunner.query(`DROP TABLE "wallet_transactions"`);
    await queryRunner.query(`DROP TABLE "system_settings"`);
    await queryRunner.query(`DROP TABLE "receipts"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_payments_tenant_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_payments_invoice_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_payments_mpesa_receipt"`);
    await queryRunner.query(`DROP TABLE "payments"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_invoices_tenant_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_invoices_billing_month"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_invoices_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_invoices_due_date"`);
    await queryRunner.query(`DROP TABLE "invoices"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_tenants_status"`);
    await queryRunner.query(`DROP TABLE "tenants"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_units_property_id"`);
    await queryRunner.query(`DROP TABLE "units"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_properties_name"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_properties_is_active"`);
    await queryRunner.query(`DROP TABLE "properties"`);
    await queryRunner.query(`DROP TABLE "audit_logs"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_users_email"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_roles_name"`);
    await queryRunner.query(`DROP TABLE "roles"`);
    await queryRunner.query(`DROP TABLE "permissions"`);

    // ─── Drop Enums ───────────────────────────────────────
    await queryRunner.query(`DROP TYPE "public"."notifications_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."notifications_channel_enum"`);
    await queryRunner.query(`DROP TYPE "public"."notifications_type_enum"`);
    await queryRunner.query(`DROP TYPE "public"."maintenance_requests_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."maintenance_requests_priority_enum"`);
    await queryRunner.query(`DROP TYPE "public"."maintenance_requests_category_enum"`);
    await queryRunner.query(`DROP TYPE "public"."expenses_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."expenses_priority_enum"`);
    await queryRunner.query(`DROP TYPE "public"."expenses_category_enum"`);
    await queryRunner.query(`DROP TYPE "public"."wallet_transactions_type_enum"`);
    await queryRunner.query(`DROP TYPE "public"."payments_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."payments_method_enum"`);
    await queryRunner.query(`DROP TYPE "public"."invoices_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."tenants_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."units_unit_type_enum"`);
    await queryRunner.query(`DROP TYPE "public"."audit_logs_targettype_enum"`);
    await queryRunner.query(`DROP TYPE "public"."audit_logs_action_enum"`);
    await queryRunner.query(`DROP TYPE "public"."users_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."permissions_action_enum"`);
    await queryRunner.query(`DROP TYPE "public"."permissions_resource_enum"`);
  }
}
