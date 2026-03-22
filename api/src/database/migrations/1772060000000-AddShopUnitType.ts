import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddShopUnitType1772060000000 implements MigrationInterface {
	name = 'AddShopUnitType1772060000000';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TYPE "public"."units_unit_type_enum" ADD VALUE IF NOT EXISTS 'shop'`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		// PostgreSQL does not support removing values from an enum type
	}
}
