import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMustChangePassword1772110000000 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		const columnExists = await queryRunner.query(`
			SELECT 1 FROM information_schema.columns
			WHERE table_name = 'users' AND column_name = 'must_change_password'
		`);
		if (columnExists.length === 0) {
			await queryRunner.query(
				`ALTER TABLE "users" ADD COLUMN "must_change_password" boolean NOT NULL DEFAULT false`,
			);
		}
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "users" DROP COLUMN "must_change_password"`,
		);
	}
}
