import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMpesaAccountReferenceToPayments1771930000000 implements MigrationInterface {
	name = 'AddMpesaAccountReferenceToPayments1771930000000';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "payments" ADD "mpesa_account_reference" character varying`,
		);
		await queryRunner.query(
			`ALTER TABLE "payments" ADD "mpesa_paybill_number" character varying`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "mpesa_paybill_number"`);
		await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "mpesa_account_reference"`);
	}
}
