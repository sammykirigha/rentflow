import { MigrationInterface, QueryRunner } from "typeorm";

export class AddedColumn1771249773830 implements MigrationInterface {
    name = 'AddedColumn1771249773830'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."notifications_status_enum" AS ENUM('pending', 'sent', 'failed')`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD "status" "public"."notifications_status_enum" NOT NULL DEFAULT 'pending'`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD "retry_count" integer NOT NULL DEFAULT '0'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "retry_count"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "status"`);
        await queryRunner.query(`DROP TYPE "public"."notifications_status_enum"`);
    }

}
