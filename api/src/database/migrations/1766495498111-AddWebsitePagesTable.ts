import { MigrationInterface, QueryRunner } from "typeorm";

export class AddWebsitePagesTable1766495498111 implements MigrationInterface {
    name = 'AddWebsitePagesTable1766495498111';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."website_pages_scraping_status_enum" AS ENUM('pending', 'processing', 'completed', 'failed')`);
        await queryRunner.query(`CREATE TABLE "website_pages" ("created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "page_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "website_id" uuid NOT NULL, "page_url" character varying NOT NULL, "page_path" character varying NOT NULL, "page_title" character varying, "page_description" text, "scraped_content" text, "scraped_meta" jsonb, "scraping_status" "public"."website_pages_scraping_status_enum" NOT NULL DEFAULT 'pending', "scraping_error" text, "scraped_at" TIMESTAMP, "depth" integer NOT NULL DEFAULT '1', "word_count" integer, CONSTRAINT "PK_401c4ba425f4807c1e7485298f8" PRIMARY KEY ("page_id"))`);
        await queryRunner.query(`ALTER TABLE "user_websites" ADD "total_pages_found" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "user_websites" ADD "total_pages_scraped" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "website_pages" ADD CONSTRAINT "FK_f904a75e615407d0c90ed939cf5" FOREIGN KEY ("website_id") REFERENCES "user_websites"("website_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "website_pages" DROP CONSTRAINT "FK_f904a75e615407d0c90ed939cf5"`);
        await queryRunner.query(`ALTER TABLE "user_websites" DROP COLUMN "total_pages_scraped"`);
        await queryRunner.query(`ALTER TABLE "user_websites" DROP COLUMN "total_pages_found"`);
        await queryRunner.query(`DROP TABLE "website_pages"`);
        await queryRunner.query(`DROP TYPE "public"."website_pages_scraping_status_enum"`);
    }

}
