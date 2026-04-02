import { MigrationInterface, QueryRunner } from 'typeorm';

export class MultiTenantFoundation1772100000000 implements MigrationInterface {
	name = 'MultiTenantFoundation1772100000000';

	public async up(queryRunner: QueryRunner): Promise<void> {
		// ── Sub-migration A: Create new tables ──────────────────────

		// Create organizations table
		await queryRunner.query(`
			CREATE TYPE "organization_status_enum" AS ENUM ('active', 'suspended', 'trial', 'cancelled')
		`);

		await queryRunner.query(`
			CREATE TABLE "organizations" (
				"organization_id" uuid NOT NULL DEFAULT uuid_generate_v4(),
				"name" varchar NOT NULL,
				"slug" varchar NOT NULL,
				"status" "organization_status_enum" NOT NULL DEFAULT 'trial',
				"owner_user_id" uuid NOT NULL,
				"mpesa_consumer_key" varchar,
				"mpesa_consumer_secret" varchar,
				"mpesa_passkey" varchar,
				"mpesa_shortcode" varchar,
				"mpesa_environment" varchar NOT NULL DEFAULT 'sandbox',
				"mpesa_callback_base_url" varchar,
				"at_api_key" varchar,
				"at_username" varchar,
				"at_sender_id" varchar,
				"logo_url" varchar,
				"primary_color" varchar,
				"support_email" varchar,
				"support_phone" varchar,
				"created_at" TIMESTAMP NOT NULL DEFAULT now(),
				"updated_at" TIMESTAMP NOT NULL DEFAULT now(),
				"deleted_at" TIMESTAMP,
				CONSTRAINT "PK_organizations" PRIMARY KEY ("organization_id"),
				CONSTRAINT "UQ_organizations_slug" UNIQUE ("slug")
			)
		`);

		await queryRunner.query(`
			CREATE UNIQUE INDEX "IDX_organizations_mpesa_shortcode"
			ON "organizations" ("mpesa_shortcode")
			WHERE "mpesa_shortcode" IS NOT NULL
		`);

		await queryRunner.query(`
			CREATE INDEX "IDX_organizations_status" ON "organizations" ("status")
		`);

		// Create subscriptions table
		await queryRunner.query(`
			CREATE TYPE "subscription_plan_enum" AS ENUM ('basic', 'pro', 'enterprise')
		`);

		await queryRunner.query(`
			CREATE TYPE "subscription_status_enum" AS ENUM ('active', 'past_due', 'cancelled', 'trial')
		`);

		await queryRunner.query(`
			CREATE TABLE "subscriptions" (
				"subscription_id" uuid NOT NULL DEFAULT uuid_generate_v4(),
				"organization_id" uuid NOT NULL,
				"plan" "subscription_plan_enum" NOT NULL DEFAULT 'basic',
				"status" "subscription_status_enum" NOT NULL DEFAULT 'trial',
				"trial_ends_at" TIMESTAMP,
				"current_period_start" TIMESTAMP,
				"current_period_end" TIMESTAMP,
				"max_properties" int NOT NULL DEFAULT 3,
				"max_units" int NOT NULL DEFAULT 50,
				"sms_quota_monthly" int NOT NULL DEFAULT 100,
				"sms_used_this_period" int NOT NULL DEFAULT 0,
				"max_manager_users" int NOT NULL DEFAULT 1,
				"has_pdf_export" boolean NOT NULL DEFAULT false,
				"has_bulk_messaging" boolean NOT NULL DEFAULT false,
				"has_api_access" boolean NOT NULL DEFAULT false,
				"created_at" TIMESTAMP NOT NULL DEFAULT now(),
				"updated_at" TIMESTAMP NOT NULL DEFAULT now(),
				"deleted_at" TIMESTAMP,
				CONSTRAINT "PK_subscriptions" PRIMARY KEY ("subscription_id"),
				CONSTRAINT "UQ_subscriptions_org" UNIQUE ("organization_id"),
				CONSTRAINT "FK_subscriptions_organization" FOREIGN KEY ("organization_id") REFERENCES "organizations"("organization_id")
			)
		`);

		// Create platform_config table
		await queryRunner.query(`
			CREATE TABLE "platform_config" (
				"platform_config_id" uuid NOT NULL DEFAULT uuid_generate_v4(),
				"key" varchar NOT NULL,
				"value" text NOT NULL,
				"description" varchar,
				"created_at" TIMESTAMP NOT NULL DEFAULT now(),
				"updated_at" TIMESTAMP NOT NULL DEFAULT now(),
				"deleted_at" TIMESTAMP,
				CONSTRAINT "PK_platform_config" PRIMARY KEY ("platform_config_id"),
				CONSTRAINT "UQ_platform_config_key" UNIQUE ("key")
			)
		`);

		// ── Sub-migration B: Add nullable organization_id to existing tables ──

		const tablesToScope = [
			'properties', 'units', 'tenants', 'invoices', 'payments',
			'wallet_transactions', 'receipts', 'expenses', 'vendors',
			'maintenance_requests', 'notifications', 'audit_logs',
			'system_settings', 'users', 'roles',
		];

		for (const table of tablesToScope) {
			// Check if column already exists before adding
			const columnExists = await queryRunner.query(`
				SELECT 1 FROM information_schema.columns
				WHERE table_name = '${table}' AND column_name = 'organization_id'
			`);

			if (columnExists.length === 0) {
				await queryRunner.query(`
					ALTER TABLE "${table}" ADD COLUMN "organization_id" uuid
				`);
			}
		}

		// ── Sub-migration C: Backfill existing data ──────────────────

		// Find existing LANDLORD user to create default organization
		const landlordUsers = await queryRunner.query(`
			SELECT u.user_id, u.email, u."firstName", u."lastName"
			FROM users u
			JOIN roles r ON u.role_id = r.role_id
			WHERE r.name = 'LANDLORD'
			LIMIT 1
		`);

		if (landlordUsers.length === 0) {
			throw new Error(
				'MIGRATION ABORT: No user with LANDLORD role found. ' +
				'A LANDLORD user is required to create the Default Organization.',
			);
		}

		let defaultOrgId: string | null = null;

		if (landlordUsers.length > 0) {
			const landlord = landlordUsers[0];

			// Create default organization
			const orgResult = await queryRunner.query(`
				INSERT INTO "organizations" ("name", "slug", "status", "owner_user_id")
				VALUES ('Default Organization', 'default', 'active', $1)
				RETURNING organization_id
			`, [landlord.user_id]);

			defaultOrgId = orgResult[0].organization_id;

			// Create default subscription (Pro plan, active)
			await queryRunner.query(`
				INSERT INTO "subscriptions" (
					"organization_id", "plan", "status",
					"max_properties", "max_units", "sms_quota_monthly",
					"max_manager_users", "has_pdf_export", "has_bulk_messaging"
				) VALUES ($1, 'pro', 'active', 10, 200, 500, 5, true, true)
			`, [defaultOrgId]);

			// Backfill all existing rows with default org ID
			for (const table of tablesToScope) {
				await queryRunner.query(`
					UPDATE "${table}" SET "organization_id" = $1
					WHERE "organization_id" IS NULL
				`, [defaultOrgId]);
			}
		}

		// ── Sub-migration D: Make organization_id NOT NULL (except users and roles) ──

		// Tables where org_id should be NOT NULL
		const notNullTables = [
			'properties', 'units', 'tenants', 'invoices', 'payments',
			'wallet_transactions', 'receipts', 'expenses', 'vendors',
			'maintenance_requests', 'notifications', 'audit_logs',
			'system_settings',
		];

		for (const table of notNullTables) {
			// Only set NOT NULL if we have data backfilled or table is empty
			const nullCount = await queryRunner.query(`
				SELECT COUNT(*) as cnt FROM "${table}" WHERE "organization_id" IS NULL
			`);

			if (parseInt(nullCount[0].cnt) === 0) {
				await queryRunner.query(`
					ALTER TABLE "${table}" ALTER COLUMN "organization_id" SET NOT NULL
				`);
			}
		}

		// Add FK constraints
		for (const table of [...notNullTables, 'users', 'roles']) {
			await queryRunner.query(`
				ALTER TABLE "${table}"
				ADD CONSTRAINT "FK_${table}_organization"
				FOREIGN KEY ("organization_id") REFERENCES "organizations"("organization_id")
			`).catch(() => {
				// Constraint may already exist, ignore
			});
		}

		// Add indexes for org-scoped tables
		const indexQueries = [
			`CREATE INDEX IF NOT EXISTS "IDX_properties_org_active" ON "properties"("organization_id", "is_active")`,
			`CREATE INDEX IF NOT EXISTS "IDX_units_org_property" ON "units"("organization_id", "property_id")`,
			`CREATE INDEX IF NOT EXISTS "IDX_tenants_org_status" ON "tenants"("organization_id", "status")`,
			`CREATE INDEX IF NOT EXISTS "IDX_invoices_org_status" ON "invoices"("organization_id", "status")`,
			`CREATE INDEX IF NOT EXISTS "IDX_invoices_org_billing" ON "invoices"("organization_id", "billing_month")`,
			`CREATE INDEX IF NOT EXISTS "IDX_invoices_org_tenant" ON "invoices"("organization_id", "tenant_id")`,
			`CREATE INDEX IF NOT EXISTS "IDX_payments_org_status" ON "payments"("organization_id", "status")`,
			`CREATE INDEX IF NOT EXISTS "IDX_audit_org_created" ON "audit_logs"("organization_id", "created_at")`,
			`CREATE INDEX IF NOT EXISTS "IDX_users_org_email" ON "users"("organization_id", "email")`,
			`CREATE INDEX IF NOT EXISTS "IDX_wallet_txn_org_tenant" ON "wallet_transactions"("organization_id", "tenant_id")`,
			`CREATE INDEX IF NOT EXISTS "IDX_expenses_org_property" ON "expenses"("organization_id", "property_id")`,
			`CREATE INDEX IF NOT EXISTS "IDX_notifications_org_tenant" ON "notifications"("organization_id", "tenant_id")`,
		];

		for (const query of indexQueries) {
			await queryRunner.query(query).catch(() => {
				// Index may already exist, ignore
			});
		}

		// ── Sub-migration E: Update role names ──────────────────────

		await queryRunner.query(`
			UPDATE "roles" SET "name" = 'ORG_OWNER' WHERE "name" = 'LANDLORD'
		`);
		await queryRunner.query(`
			UPDATE "roles" SET "name" = 'ORG_MANAGER' WHERE "name" = 'MANAGER'
		`);
		await queryRunner.query(`
			UPDATE "roles" SET "name" = 'ORG_TENANT' WHERE "name" = 'TENANT'
		`);

		// Create SUPER_ADMIN role if it doesn't exist
		const superAdminExists = await queryRunner.query(`
			SELECT 1 FROM "roles" WHERE "name" = 'SUPER_ADMIN'
		`);

		if (superAdminExists.length === 0) {
			await queryRunner.query(`
				INSERT INTO "roles" ("name", "description", "is_system_role", "is_admin_role")
				VALUES ('SUPER_ADMIN', 'Platform super administrator', true, true)
			`);
		}

		// Extend permissions_resource_enum with new values
		// PostgreSQL requires ALTER TYPE ADD VALUE to be committed before the new values can be used.
		// We must commit the current transaction, add enum values outside a transaction, then start a new one.
		await queryRunner.commitTransaction();

		const newEnumValues = ['organizations', 'subscriptions', 'platform_config'];
		for (const val of newEnumValues) {
			const exists = await queryRunner.query(`
				SELECT 1 FROM pg_enum
				WHERE enumlabel = $1
				AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'permissions_resource_enum')
			`, [val]);

			if (exists.length === 0) {
				await queryRunner.query(`ALTER TYPE "permissions_resource_enum" ADD VALUE IF NOT EXISTS '${val}'`);
			}
		}

		await queryRunner.startTransaction();

		// Add new permission resources
		const newResources = ['organizations', 'subscriptions', 'platform_config'];
		const actions = ['create', 'read', 'update', 'delete'];

		for (const resource of newResources) {
			for (const action of actions) {
				const exists = await queryRunner.query(`
					SELECT 1 FROM "permissions" WHERE "resource" = $1 AND "action" = $2
				`, [resource, action]);

				if (exists.length === 0) {
					await queryRunner.query(`
						INSERT INTO "permissions" ("resource", "action", "name")
						VALUES ($1, $2, $3)
					`, [resource, action, `${action}_${resource}`]);
				}
			}
		}

		// Insert default platform config values
		const defaultConfigs = [
			{ key: 'default_trial_days', value: '14', description: 'Default trial period in days' },
			{ key: 'platform_name', value: 'RentFlow', description: 'Platform display name' },
			{ key: 'maintenance_mode', value: 'false', description: 'Enable platform-wide maintenance mode' },
		];

		for (const config of defaultConfigs) {
			const exists = await queryRunner.query(`
				SELECT 1 FROM "platform_config" WHERE "key" = $1
			`, [config.key]);

			if (exists.length === 0) {
				await queryRunner.query(`
					INSERT INTO "platform_config" ("key", "value", "description")
					VALUES ($1, $2, $3)
				`, [config.key, config.value, config.description]);
			}
		}
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		// Remove new permission rows (enum values can't be removed in PG, but rows can)
		await queryRunner.query(`DELETE FROM "permissions" WHERE "resource" IN ('organizations', 'subscriptions', 'platform_config')`);

		// Reverse role name changes
		await queryRunner.query(`UPDATE "roles" SET "name" = 'LANDLORD' WHERE "name" = 'ORG_OWNER'`);
		await queryRunner.query(`UPDATE "roles" SET "name" = 'MANAGER' WHERE "name" = 'ORG_MANAGER'`);
		await queryRunner.query(`UPDATE "roles" SET "name" = 'TENANT' WHERE "name" = 'ORG_TENANT'`);
		await queryRunner.query(`DELETE FROM "roles" WHERE "name" = 'SUPER_ADMIN'`);

		// Drop FK constraints and organization_id columns
		const tables = [
			'properties', 'units', 'tenants', 'invoices', 'payments',
			'wallet_transactions', 'receipts', 'expenses', 'vendors',
			'maintenance_requests', 'notifications', 'audit_logs',
			'system_settings', 'users', 'roles',
		];

		for (const table of tables) {
			await queryRunner.query(`ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "FK_${table}_organization"`);
			await queryRunner.query(`ALTER TABLE "${table}" DROP COLUMN IF EXISTS "organization_id"`);
		}

		// Drop new tables
		await queryRunner.query(`DROP TABLE IF EXISTS "platform_config"`);
		await queryRunner.query(`DROP TABLE IF EXISTS "subscriptions"`);
		await queryRunner.query(`DROP TABLE IF EXISTS "organizations"`);

		// Drop enums
		await queryRunner.query(`DROP TYPE IF EXISTS "subscription_status_enum"`);
		await queryRunner.query(`DROP TYPE IF EXISTS "subscription_plan_enum"`);
		await queryRunner.query(`DROP TYPE IF EXISTS "organization_status_enum"`);
	}
}
