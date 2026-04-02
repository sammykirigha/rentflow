import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMeterReadingsRentEscalationsTenantChecklists1772130000000 implements MigrationInterface {
	name = 'AddMeterReadingsRentEscalationsTenantChecklists1772130000000';

	public async up(queryRunner: QueryRunner): Promise<void> {
		// ── 1. Create enum types ────────────────────────────

		await queryRunner.query(`
			CREATE TYPE "meter_type_enum" AS ENUM ('water', 'electricity')
		`);

		await queryRunner.query(`
			CREATE TYPE "escalation_status_enum" AS ENUM ('pending', 'notified', 'applied', 'cancelled')
		`);

		await queryRunner.query(`
			CREATE TYPE "checklist_type_enum" AS ENUM ('onboarding', 'exit')
		`);

		// ── 2. Create meter_readings table ──────────────────

		await queryRunner.query(`
			CREATE TABLE "meter_readings" (
				"meter_reading_id" uuid NOT NULL DEFAULT uuid_generate_v4(),
				"organization_id" uuid NOT NULL,
				"unit_id" uuid NOT NULL,
				"meter_type" "meter_type_enum" NOT NULL,
				"reading_date" TIMESTAMP NOT NULL,
				"billing_month" TIMESTAMP NOT NULL,
				"previous_reading" decimal(10,2) NOT NULL DEFAULT 0,
				"current_reading" decimal(10,2) NOT NULL,
				"consumption" decimal(10,2) NOT NULL DEFAULT 0,
				"rate" decimal(10,2) NOT NULL DEFAULT 0,
				"total_charge" decimal(10,2) NOT NULL DEFAULT 0,
				"notes" varchar,
				"created_at" TIMESTAMP NOT NULL DEFAULT now(),
				"updated_at" TIMESTAMP NOT NULL DEFAULT now(),
				"deleted_at" TIMESTAMP,
				CONSTRAINT "PK_meter_readings" PRIMARY KEY ("meter_reading_id"),
				CONSTRAINT "FK_meter_readings_organization" FOREIGN KEY ("organization_id") REFERENCES "organizations"("organization_id"),
				CONSTRAINT "FK_meter_readings_unit" FOREIGN KEY ("unit_id") REFERENCES "units"("unit_id")
			)
		`);

		await queryRunner.query(`
			CREATE INDEX "IDX_meter_readings_unit_billing" ON "meter_readings" ("unit_id", "billing_month")
		`);

		await queryRunner.query(`
			CREATE INDEX "IDX_meter_readings_org_billing" ON "meter_readings" ("organization_id", "billing_month")
		`);

		// ── 3. Create rent_escalations table ────────────────

		await queryRunner.query(`
			CREATE TABLE "rent_escalations" (
				"rent_escalation_id" uuid NOT NULL DEFAULT uuid_generate_v4(),
				"organization_id" uuid NOT NULL,
				"property_id" uuid NOT NULL,
				"percentage" decimal(5,2) NOT NULL,
				"effective_date" TIMESTAMP NOT NULL,
				"status" "escalation_status_enum" NOT NULL DEFAULT 'pending',
				"notified_at" TIMESTAMP,
				"applied_at" TIMESTAMP,
				"notes" varchar,
				"created_at" TIMESTAMP NOT NULL DEFAULT now(),
				"updated_at" TIMESTAMP NOT NULL DEFAULT now(),
				"deleted_at" TIMESTAMP,
				CONSTRAINT "PK_rent_escalations" PRIMARY KEY ("rent_escalation_id"),
				CONSTRAINT "FK_rent_escalations_organization" FOREIGN KEY ("organization_id") REFERENCES "organizations"("organization_id"),
				CONSTRAINT "FK_rent_escalations_property" FOREIGN KEY ("property_id") REFERENCES "properties"("property_id")
			)
		`);

		await queryRunner.query(`
			CREATE INDEX "IDX_rent_escalations_property_date_status" ON "rent_escalations" ("property_id", "effective_date", "status")
		`);

		await queryRunner.query(`
			CREATE INDEX "IDX_rent_escalations_org_status" ON "rent_escalations" ("organization_id", "status")
		`);

		// ── 4. Create tenant_checklists table ───────────────

		await queryRunner.query(`
			CREATE TABLE "tenant_checklists" (
				"checklist_id" uuid NOT NULL DEFAULT uuid_generate_v4(),
				"organization_id" uuid NOT NULL,
				"tenant_id" uuid NOT NULL,
				"type" "checklist_type_enum" NOT NULL,
				"items" jsonb NOT NULL DEFAULT '[]',
				"completed_at" TIMESTAMP,
				"created_at" TIMESTAMP NOT NULL DEFAULT now(),
				"updated_at" TIMESTAMP NOT NULL DEFAULT now(),
				"deleted_at" TIMESTAMP,
				CONSTRAINT "PK_tenant_checklists" PRIMARY KEY ("checklist_id"),
				CONSTRAINT "FK_tenant_checklists_organization" FOREIGN KEY ("organization_id") REFERENCES "organizations"("organization_id"),
				CONSTRAINT "FK_tenant_checklists_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id")
			)
		`);

		await queryRunner.query(`
			CREATE INDEX "IDX_tenant_checklists_tenant_type" ON "tenant_checklists" ("tenant_id", "type")
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP TABLE IF EXISTS "tenant_checklists"`);
		await queryRunner.query(`DROP TABLE IF EXISTS "rent_escalations"`);
		await queryRunner.query(`DROP TABLE IF EXISTS "meter_readings"`);

		await queryRunner.query(`DROP TYPE IF EXISTS "checklist_type_enum"`);
		await queryRunner.query(`DROP TYPE IF EXISTS "escalation_status_enum"`);
		await queryRunner.query(`DROP TYPE IF EXISTS "meter_type_enum"`);
	}
}
