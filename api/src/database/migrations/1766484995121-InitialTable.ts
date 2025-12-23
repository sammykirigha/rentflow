import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialTable1766484995121 implements MigrationInterface {
    name = 'InitialTable1766484995121'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."permissions_resource_enum" AS ENUM('users', 'settings', 'ai_models', 'questions', 'reports', 'billing')`);
        await queryRunner.query(`CREATE TYPE "public"."permissions_action_enum" AS ENUM('create', 'read', 'update', 'delete', 'suspend', 'export', 'view_sensitive')`);
        await queryRunner.query(`CREATE TABLE "permissions" ("created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "permission_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "resource" "public"."permissions_resource_enum" NOT NULL, "action" "public"."permissions_action_enum" NOT NULL, "name" character varying NOT NULL, "description" text, CONSTRAINT "PK_1717db2235a5b169822e7f753b1" PRIMARY KEY ("permission_id"))`);
        await queryRunner.query(`CREATE TABLE "roles" ("created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "role_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "description" text, "is_system_role" boolean NOT NULL DEFAULT false, "is_admin_role" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_648e3f5447f725579d7d4ffdfb7" UNIQUE ("name"), CONSTRAINT "PK_09f4c8130b54f35925588a37b6a" PRIMARY KEY ("role_id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_648e3f5447f725579d7d4ffdfb" ON "roles" ("name") `);
        await queryRunner.query(`CREATE TYPE "public"."users_status_enum" AS ENUM('PENDING', 'ACTIVE', 'INACTIVE', 'SUSPENDED')`);
        await queryRunner.query(`CREATE TABLE "users" ("created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "user_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "role_id" uuid, "email" character varying NOT NULL, "password" character varying NOT NULL, "firstName" character varying, "lastName" character varying, "phone" character varying, "avatar_url" character varying, "status" "public"."users_status_enum" NOT NULL DEFAULT 'ACTIVE', "phone_verified" boolean NOT NULL DEFAULT false, "phone_verification_token" character varying, "phone_verification_expires" TIMESTAMP, "email_verified" boolean NOT NULL DEFAULT false, "email_verification_token" character varying, "email_verification_expires" TIMESTAMP, "reset_password_token" character varying, "reset_password_expires" TIMESTAMP, "suspension_reason" text, "last_login_at" TIMESTAMP, "refresh_token" character varying, CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_96aac72f1574b88752e9fb00089" PRIMARY KEY ("user_id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users" ("email") `);
        await queryRunner.query(`CREATE TYPE "public"."audit_logs_action_enum" AS ENUM('user_suspended', 'user_reactivated', 'user_created', 'user_updated', 'user_deleted', 'user_role_changed', 'paper_approved', 'paper_rejected', 'paper_suspended', 'paper_taken_down', 'paper_reactivated', 'payout_approved', 'payout_rejected', 'payout_processed', 'report_resolved', 'report_dismissed', 'settings_updated', 'credit_package_created', 'credit_package_updated', 'credit_package_deleted', 'ai_model_created', 'ai_model_updated', 'ai_model_deleted', 'ai_model_default_set', 'ai_model_api_key_viewed', 'ai_model_connection_tested', 'admin_created', 'admin_role_assigned', 'admin_permissions_changed', 'role_created', 'role_updated', 'role_deleted', 'subscription_package_created', 'subscription_package_updated', 'subscription_package_deleted', 'stripe_settings_updated', 'stripe_connection_tested', 'created', 'updated', 'deleted')`);
        await queryRunner.query(`CREATE TYPE "public"."audit_logs_targettype_enum" AS ENUM('user', 'paper', 'report', 'payout', 'settings', 'ai_model', 'credit_package', 'role', 'permission', 'admin', 'subscription_package', 'stripe_settings')`);
        await queryRunner.query(`CREATE TABLE "audit_logs" ("created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "audit_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "action" "public"."audit_logs_action_enum" NOT NULL, "performed_by" uuid NOT NULL, "performer_name" character varying, "targetType" "public"."audit_logs_targettype_enum" NOT NULL, "target_id" character varying, "details" text NOT NULL, "ip_address" character varying, "metadata" jsonb, CONSTRAINT "PK_6f2dad3880d1d6f9bf560ea91c7" PRIMARY KEY ("audit_id"))`);
        await queryRunner.query(`CREATE TYPE "public"."ai_model_configurations_provider_enum" AS ENUM('openai', 'anthropic', 'google', 'custom')`);
        await queryRunner.query(`CREATE TABLE "ai_model_configurations" ("created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "model_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "provider" "public"."ai_model_configurations_provider_enum" NOT NULL, "model_name" character varying(100) NOT NULL, "display_name" character varying(100) NOT NULL, "description" text, "api_endpoint" character varying(500), "api_key_encrypted" text, "is_default" boolean NOT NULL DEFAULT false, "is_active" boolean NOT NULL DEFAULT true, "max_tokens" integer NOT NULL DEFAULT '4000', "temperature" numeric(3,2) NOT NULL DEFAULT '0.7', "top_p" numeric(3,2) NOT NULL DEFAULT '1', "frequency_penalty" numeric(3,2) NOT NULL DEFAULT '0', "presence_penalty" numeric(3,2) NOT NULL DEFAULT '0', "input_cost_per_1k_tokens" numeric(10,4) NOT NULL DEFAULT '1', "output_cost_per_1k_tokens" numeric(10,4) NOT NULL DEFAULT '3', "minimum_credits" integer NOT NULL DEFAULT '1', "model_multiplier" numeric(5,2) NOT NULL DEFAULT '1', "last_connection_at" TIMESTAMP, "last_connection_successful" boolean, "last_connection_error" text, CONSTRAINT "PK_1a72693aadc58de66927277edcf" PRIMARY KEY ("model_id"))`);
        await queryRunner.query(`CREATE TABLE "system_settings" ("created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "system_setting_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "platform_name" character varying NOT NULL DEFAULT 'Edu AI Platform', "support_email" character varying NOT NULL DEFAULT 'support@eduai.com', "app_logo" character varying(500), "app_favicon" character varying(500), "contact_phone" character varying(20), "contact_address" text, "social_facebook" character varying(200), "social_twitter" character varying(200), "social_linkedin" character varying(200), "social_instagram" character varying(200), "max_file_upload_size" integer NOT NULL DEFAULT '10', "allowed_file_types" text, "default_ai_model_id" uuid, "allow_signup" boolean NOT NULL DEFAULT false, "require_verification" boolean NOT NULL DEFAULT false, "email_notifications" boolean NOT NULL DEFAULT true, "sms_notifications" boolean NOT NULL DEFAULT false, "admin_alerts" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_4e817db22a3cc7f4455232ee8ea" PRIMARY KEY ("system_setting_id"))`);
        await queryRunner.query(`CREATE TABLE "role_permissions" ("role_id" uuid NOT NULL, "permission_id" uuid NOT NULL, CONSTRAINT "PK_25d24010f53bb80b78e412c9656" PRIMARY KEY ("role_id", "permission_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_178199805b901ccd220ab7740e" ON "role_permissions" ("role_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_17022daf3f885f7d35423e9971" ON "role_permissions" ("permission_id") `);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_a2cecd1a3531c0b041e29ba46e1" FOREIGN KEY ("role_id") REFERENCES "roles"("role_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "audit_logs" ADD CONSTRAINT "FK_ae97aac6d6d471b9d88cea1c971" FOREIGN KEY ("performed_by") REFERENCES "users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "system_settings" ADD CONSTRAINT "FK_e88330d1174f4fcec47785f53ba" FOREIGN KEY ("default_ai_model_id") REFERENCES "ai_model_configurations"("model_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_178199805b901ccd220ab7740ec" FOREIGN KEY ("role_id") REFERENCES "roles"("role_id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_17022daf3f885f7d35423e9971e" FOREIGN KEY ("permission_id") REFERENCES "permissions"("permission_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_17022daf3f885f7d35423e9971e"`);
        await queryRunner.query(`ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_178199805b901ccd220ab7740ec"`);
        await queryRunner.query(`ALTER TABLE "system_settings" DROP CONSTRAINT "FK_e88330d1174f4fcec47785f53ba"`);
        await queryRunner.query(`ALTER TABLE "audit_logs" DROP CONSTRAINT "FK_ae97aac6d6d471b9d88cea1c971"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_a2cecd1a3531c0b041e29ba46e1"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_17022daf3f885f7d35423e9971"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_178199805b901ccd220ab7740e"`);
        await queryRunner.query(`DROP TABLE "role_permissions"`);
        await queryRunner.query(`DROP TABLE "system_settings"`);
        await queryRunner.query(`DROP TABLE "ai_model_configurations"`);
        await queryRunner.query(`DROP TYPE "public"."ai_model_configurations_provider_enum"`);
        await queryRunner.query(`DROP TABLE "audit_logs"`);
        await queryRunner.query(`DROP TYPE "public"."audit_logs_targettype_enum"`);
        await queryRunner.query(`DROP TYPE "public"."audit_logs_action_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_97672ac88f789774dd47f7c8be"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_648e3f5447f725579d7d4ffdfb"`);
        await queryRunner.query(`DROP TABLE "roles"`);
        await queryRunner.query(`DROP TABLE "permissions"`);
        await queryRunner.query(`DROP TYPE "public"."permissions_action_enum"`);
        await queryRunner.query(`DROP TYPE "public"."permissions_resource_enum"`);
    }

}
