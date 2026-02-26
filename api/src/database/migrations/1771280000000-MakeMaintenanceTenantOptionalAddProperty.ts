import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeMaintenanceTenantOptionalAddProperty1771280000000
	implements MigrationInterface
{
	name = 'MakeMaintenanceTenantOptionalAddProperty1771280000000';

	public async up(queryRunner: QueryRunner): Promise<void> {
		// Make tenant_id nullable on maintenance_requests
		await queryRunner.query(
			`ALTER TABLE "maintenance_requests" ALTER COLUMN "tenant_id" DROP NOT NULL`,
		);

		// Add property_id column
		await queryRunner.query(
			`ALTER TABLE "maintenance_requests" ADD COLUMN "property_id" uuid`,
		);

		// Add foreign key constraint
		await queryRunner.query(
			`ALTER TABLE "maintenance_requests" ADD CONSTRAINT "FK_maintenance_requests_property" FOREIGN KEY ("property_id") REFERENCES "properties"("property_id") ON DELETE SET NULL ON UPDATE NO ACTION`,
		);

		// Add index on property_id
		await queryRunner.query(
			`CREATE INDEX "IDX_maintenance_requests_property_id" ON "maintenance_requests" ("property_id")`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`DROP INDEX "IDX_maintenance_requests_property_id"`,
		);
		await queryRunner.query(
			`ALTER TABLE "maintenance_requests" DROP CONSTRAINT "FK_maintenance_requests_property"`,
		);
		await queryRunner.query(
			`ALTER TABLE "maintenance_requests" DROP COLUMN "property_id"`,
		);
		await queryRunner.query(
			`ALTER TABLE "maintenance_requests" ALTER COLUMN "tenant_id" SET NOT NULL`,
		);
	}
}
