import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOnboardingAndUserWebsites1766488441595 implements MigrationInterface {
    name = 'AddOnboardingAndUserWebsites1766488441595';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."user_websites_scraping_status_enum" AS ENUM('pending', 'processing', 'completed', 'failed')`);
        await queryRunner.query(`CREATE TABLE "user_websites" ("created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "website_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "website_url" character varying NOT NULL, "website_name" character varying, "website_description" text, "scraped_content" text, "scraped_meta" jsonb, "scraping_status" "public"."user_websites_scraping_status_enum" NOT NULL DEFAULT 'pending', "scraping_error" text, "scraped_at" TIMESTAMP, "is_primary" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_5ab92510f3fbfee7426da60bc0c" PRIMARY KEY ("website_id"))`);
        await queryRunner.query(`ALTER TABLE "users" ADD "is_onboarded" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "user_websites" ADD CONSTRAINT "FK_aca83d55146e59f5b1c8de79ef3" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_websites" DROP CONSTRAINT "FK_aca83d55146e59f5b1c8de79ef3"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "is_onboarded"`);
        await queryRunner.query(`DROP TABLE "user_websites"`);
        await queryRunner.query(`DROP TYPE "public"."user_websites_scraping_status_enum"`);
    }

}
