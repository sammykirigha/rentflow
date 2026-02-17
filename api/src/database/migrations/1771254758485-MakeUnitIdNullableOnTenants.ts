import { MigrationInterface, QueryRunner } from "typeorm";

export class MakeUnitIdNullableOnTenants1771254758485 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tenants" ALTER COLUMN "unit_id" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tenants" ALTER COLUMN "unit_id" SET NOT NULL`);
    }

}
