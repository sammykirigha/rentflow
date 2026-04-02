import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddReadAtToNotifications1772170000000 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.addColumn(
			'notifications',
			new TableColumn({
				name: 'read_at',
				type: 'timestamp',
				isNullable: true,
			}),
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.dropColumn('notifications', 'read_at');
	}
}
