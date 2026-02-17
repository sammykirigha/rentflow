import { MigrationInterface, QueryRunner } from "typeorm";

export class AddedColumn1771241242986 implements MigrationInterface {
    name = 'AddedColumn1771241242986'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."units_unit_type_enum" AS ENUM('studio', 'bedsitter', 'one_bedroom', 'two_bedroom', 'three_bedroom')`);
        await queryRunner.query(`ALTER TABLE "units" ADD "unit_type" "public"."units_unit_type_enum" NOT NULL DEFAULT 'one_bedroom'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "units" DROP COLUMN "unit_type"`);
        await queryRunner.query(`DROP TYPE "public"."units_unit_type_enum"`);
    }

}
