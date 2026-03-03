import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInvoiceTypeAndRecipientName1772040000000 implements MigrationInterface {
	name = 'AddInvoiceTypeAndRecipientName1772040000000';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`CREATE TYPE "invoice_type_enum" AS ENUM ('rent', 'security_deposit', 'service_fee', 'maintenance', 'other')`,
		);
		await queryRunner.query(
			`ALTER TABLE "invoices" ADD "invoice_type" "invoice_type_enum" NOT NULL DEFAULT 'rent'`,
		);
		await queryRunner.query(
			`ALTER TABLE "invoices" ADD "recipient_name" varchar`,
		);
		await queryRunner.query(
			`ALTER TABLE "invoices" ALTER COLUMN "tenant_id" DROP NOT NULL`,
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_invoices_invoice_type" ON "invoices" ("invoice_type")`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP INDEX "IDX_invoices_invoice_type"`);
		await queryRunner.query(
			`ALTER TABLE "invoices" ALTER COLUMN "tenant_id" SET NOT NULL`,
		);
		await queryRunner.query(`ALTER TABLE "invoices" DROP COLUMN "recipient_name"`);
		await queryRunner.query(`ALTER TABLE "invoices" DROP COLUMN "invoice_type"`);
		await queryRunner.query(`DROP TYPE "invoice_type_enum"`);
	}
}
