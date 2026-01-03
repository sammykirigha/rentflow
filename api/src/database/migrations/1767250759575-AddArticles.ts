import { MigrationInterface, QueryRunner } from "typeorm";

export class AddArticles1767250759575 implements MigrationInterface {
    name = 'AddArticles1767250759575';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."articles_status_enum" AS ENUM('draft', 'generating', 'generated', 'published', 'failed')`);
        await queryRunner.query(`CREATE TABLE "articles" ("created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "article_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "title" character varying NOT NULL, "content" text, "content_json" json, "content_briefing" text, "reference_content" text, "primary_keyword_id" uuid NOT NULL, "ai_model_id" uuid, "status" "public"."articles_status_enum" NOT NULL DEFAULT 'draft', "generation_error" text, "token_usage" json, "word_count" integer NOT NULL DEFAULT '0', "generated_at" TIMESTAMP, CONSTRAINT "PK_b9a16e8d0dc20426e1611e560bc" PRIMARY KEY ("article_id"))`);
        await queryRunner.query(`CREATE TABLE "article_secondary_keywords" ("article_id" uuid NOT NULL, "keyword_id" uuid NOT NULL, CONSTRAINT "PK_dd50bcb243ab11ab67289733a0e" PRIMARY KEY ("article_id", "keyword_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_4a9878bf989b6387a278c0285b" ON "article_secondary_keywords" ("article_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_f55f6ca6a419bc4a0b138fbe7f" ON "article_secondary_keywords" ("keyword_id") `);
        await queryRunner.query(`ALTER TABLE "articles" ADD CONSTRAINT "FK_87bb15395540ae06337a486a77a" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "articles" ADD CONSTRAINT "FK_4c9025a25dc4647bfc44271d015" FOREIGN KEY ("primary_keyword_id") REFERENCES "keywords"("keyword_id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "articles" ADD CONSTRAINT "FK_40a0112e3d6e511c598883027b4" FOREIGN KEY ("ai_model_id") REFERENCES "ai_model_configurations"("model_id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "article_secondary_keywords" ADD CONSTRAINT "FK_4a9878bf989b6387a278c0285b3" FOREIGN KEY ("article_id") REFERENCES "articles"("article_id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "article_secondary_keywords" ADD CONSTRAINT "FK_f55f6ca6a419bc4a0b138fbe7f4" FOREIGN KEY ("keyword_id") REFERENCES "keywords"("keyword_id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "article_secondary_keywords" DROP CONSTRAINT "FK_f55f6ca6a419bc4a0b138fbe7f4"`);
        await queryRunner.query(`ALTER TABLE "article_secondary_keywords" DROP CONSTRAINT "FK_4a9878bf989b6387a278c0285b3"`);
        await queryRunner.query(`ALTER TABLE "articles" DROP CONSTRAINT "FK_40a0112e3d6e511c598883027b4"`);
        await queryRunner.query(`ALTER TABLE "articles" DROP CONSTRAINT "FK_4c9025a25dc4647bfc44271d015"`);
        await queryRunner.query(`ALTER TABLE "articles" DROP CONSTRAINT "FK_87bb15395540ae06337a486a77a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f55f6ca6a419bc4a0b138fbe7f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4a9878bf989b6387a278c0285b"`);
        await queryRunner.query(`DROP TABLE "article_secondary_keywords"`);
        await queryRunner.query(`DROP TABLE "articles"`);
        await queryRunner.query(`DROP TYPE "public"."articles_status_enum"`);
    }

}
