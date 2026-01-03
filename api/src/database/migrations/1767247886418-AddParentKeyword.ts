import { MigrationInterface, QueryRunner } from "typeorm";

export class AddParentKeyword1767247886418 implements MigrationInterface {
    name = 'AddParentKeyword1767247886418';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "keywords" ADD "parent_keyword_id" uuid`);
        await queryRunner.query(`ALTER TABLE "keywords" ADD CONSTRAINT "FK_61864b53640cd8303fd08185004" FOREIGN KEY ("parent_keyword_id") REFERENCES "keywords"("keyword_id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "keywords" DROP CONSTRAINT "FK_61864b53640cd8303fd08185004"`);
        await queryRunner.query(`ALTER TABLE "keywords" DROP COLUMN "parent_keyword_id"`);
    }
}
