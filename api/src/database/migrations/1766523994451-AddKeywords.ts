import { MigrationInterface, QueryRunner } from "typeorm";

export class AddKeywords1766523994451 implements MigrationInterface {
    name = 'AddKeywords1766523994451';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."keywords_competition_enum" AS ENUM('low', 'medium', 'high')`);
        await queryRunner.query(`CREATE TABLE "keywords" ("created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "keyword_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "keyword" character varying NOT NULL, "competition" "public"."keywords_competition_enum" NOT NULL DEFAULT 'medium', "volume" integer NOT NULL DEFAULT '0', "recommended_title" text, "ai_analysis" json, "is_analyzed" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_3a77a901e9085f50f5884007b92" PRIMARY KEY ("keyword_id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_c51d5f0ece57ca3a97d6772536" ON "keywords" ("user_id", "keyword") `);
        await queryRunner.query(`ALTER TABLE "keywords" ADD CONSTRAINT "FK_b79282e25786c8aedf6fbe2b76a" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "keywords" DROP CONSTRAINT "FK_b79282e25786c8aedf6fbe2b76a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c51d5f0ece57ca3a97d6772536"`);
        await queryRunner.query(`DROP TABLE "keywords"`);
        await queryRunner.query(`DROP TYPE "public"."keywords_competition_enum"`);
    }

}
