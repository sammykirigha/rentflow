import { MigrationInterface, QueryRunner } from "typeorm";

export class AddContentBriefingPrompt1767249422855 implements MigrationInterface {
    name = 'AddContentBriefingPrompt1767249422855';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "system_settings" ADD "content_briefing_prompt" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "system_settings" DROP COLUMN "content_briefing_prompt"`);
    }

}
