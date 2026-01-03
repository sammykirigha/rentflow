import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIsPrimaryFlagForKeywords1767247180019 implements MigrationInterface {
    name = 'AddIsPrimaryFlagForKeywords1767247180019';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "keywords" ADD "is_primary" boolean NOT NULL DEFAULT true`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "keywords" DROP COLUMN "is_primary"`);
    }

}
