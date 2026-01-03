import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSoftDeleteToWebsitePages1766497381391 implements MigrationInterface {
    name = 'AddSoftDeleteToWebsitePages1766497381391'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "website_pages" ADD "deleted_by" character varying`);
        await queryRunner.query(`ALTER TABLE "ai_model_configurations" ALTER COLUMN "temperature" SET DEFAULT '0.7'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ai_model_configurations" ALTER COLUMN "temperature" SET DEFAULT 0.7`);
        await queryRunner.query(`ALTER TABLE "website_pages" DROP COLUMN "deleted_by"`);
    }

}
