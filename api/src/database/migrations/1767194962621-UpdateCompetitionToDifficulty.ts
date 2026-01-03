import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateCompetitionToDifficulty1767194962621 implements MigrationInterface {
    name = 'UpdateCompetitionToDifficulty1767194962621';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add new difficulty column
        await queryRunner.query(`ALTER TABLE "keywords" ADD "difficulty" integer NOT NULL DEFAULT 50`);

        // Convert existing competition enum values to difficulty scores
        await queryRunner.query(`
            UPDATE "keywords" 
            SET "difficulty" = CASE 
                WHEN "competition" = 'low' THEN 20
                WHEN "competition" = 'medium' THEN 50  
                WHEN "competition" = 'high' THEN 80
                ELSE 50
            END
        `);

        // Drop the old competition column
        await queryRunner.query(`ALTER TABLE "keywords" DROP COLUMN "competition"`);

        // Drop the enum type
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."keywords_competition_enum"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Recreate the enum type
        await queryRunner.query(`CREATE TYPE "public"."keywords_competition_enum" AS ENUM('low', 'medium', 'high')`);

        // Add back the competition column
        await queryRunner.query(`ALTER TABLE "keywords" ADD "competition" "public"."keywords_competition_enum" NOT NULL DEFAULT 'medium'`);

        // Convert difficulty scores back to competition enum values
        await queryRunner.query(`
            UPDATE "keywords" 
            SET "competition" = CASE 
                WHEN "difficulty" <= 30 THEN 'low'::"public"."keywords_competition_enum"
                WHEN "difficulty" <= 60 THEN 'medium'::"public"."keywords_competition_enum"
                ELSE 'high'::"public"."keywords_competition_enum"
            END
        `);

        // Drop the difficulty column
        await queryRunner.query(`ALTER TABLE "keywords" DROP COLUMN "difficulty"`);
    }

}
