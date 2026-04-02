import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLastInvoiceGenerationMonth1772180000000 implements MigrationInterface {
	name = 'AddLastInvoiceGenerationMonth1772180000000';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "system_settings" ADD "last_invoice_generation_month" TIMESTAMP`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "system_settings" DROP COLUMN "last_invoice_generation_month"`,
		);
	}
}
