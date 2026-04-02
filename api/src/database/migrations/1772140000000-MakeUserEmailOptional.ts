import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeUserEmailOptional1772140000000 implements MigrationInterface {
	name = 'MakeUserEmailOptional1772140000000';

	public async up(queryRunner: QueryRunner): Promise<void> {
		const result = await queryRunner.query(`
			SELECT is_nullable FROM information_schema.columns
			WHERE table_name = 'users' AND column_name = 'email'
		`);
		if (result.length > 0 && result[0].is_nullable === 'NO') {
			await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL`);
		}
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL`);
	}
}
