import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTaglineToOrganizations1772120000000 implements MigrationInterface {
	name = 'AddTaglineToOrganizations1772120000000';

	public async up(queryRunner: QueryRunner): Promise<void> {
		const columnExists = await queryRunner.query(`
			SELECT 1 FROM information_schema.columns
			WHERE table_name = 'organizations' AND column_name = 'tagline'
		`);

		if (columnExists.length === 0) {
			await queryRunner.query(`
				ALTER TABLE "organizations" ADD COLUMN "tagline" varchar
			`);
		}
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			ALTER TABLE "organizations" DROP COLUMN IF EXISTS "tagline"
		`);
	}
}
