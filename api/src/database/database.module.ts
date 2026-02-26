import { entities } from '@/config/database.config';
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { InitialSchema1771270000000 } from './migrations/1771270000000-InitialSchema';
import { MakeMaintenanceTenantOptionalAddProperty1771280000000 } from './migrations/1771280000000-MakeMaintenanceTenantOptionalAddProperty';
import { AddBulkMessageSentAuditAction1771290000000 } from './migrations/1771290000000-AddBulkMessageSentAuditAction';
import { AddedColumn1771418819175 } from './migrations/1771418819175-AddedColumn';
import { AddPaymentReconciliationFields1771430000000 } from './migrations/1771430000000-AddPaymentReconciliationFields';
import { AddedAColumnToPayment1771922968021 } from './migrations/1771922968021-AddedAColumnToPayment';
import { AddMpesaAccountReferenceToPayments1771930000000 } from './migrations/1771930000000-AddMpesaAccountReferenceToPayments';
import { AddCreditReconciliationWalletTxnType1771940000000 } from './migrations/1771940000000-AddCreditReconciliationWalletTxnType';
import { AddDepositFieldsToTenants1771960000000 } from './migrations/1771960000000-AddDepositFieldsToTenants';
import { AddRecurringChargesToSystemSettings1771970000000 } from './migrations/1771970000000-AddRecurringChargesToSystemSettings';
import { BackfillDepositStatusForPaidDeposits1771980000000 } from './migrations/1771980000000-BackfillDepositStatusForPaidDeposits';
import { AddDepositRefundedAuditAction1771990000000 } from './migrations/1771990000000-AddDepositRefundedAuditAction';
import { AddMpesaCheckoutRequestIdToPayments1772000000000 } from './migrations/1772000000000-AddMpesaCheckoutRequestIdToPayments';

const migrations = [
	InitialSchema1771270000000,
	MakeMaintenanceTenantOptionalAddProperty1771280000000,
	AddBulkMessageSentAuditAction1771290000000,
	AddedColumn1771418819175,
	AddPaymentReconciliationFields1771430000000,
	AddedAColumnToPayment1771922968021,
	AddMpesaAccountReferenceToPayments1771930000000,
	AddCreditReconciliationWalletTxnType1771940000000,
	AddDepositFieldsToTenants1771960000000,
	AddRecurringChargesToSystemSettings1771970000000,
	BackfillDepositStatusForPaidDeposits1771980000000,
	AddDepositRefundedAuditAction1771990000000,
	AddMpesaCheckoutRequestIdToPayments1772000000000,
];

@Global()
@Module({
	imports: [
		TypeOrmModule.forRootAsync({
			useFactory: (configService: ConfigService) => ({
				type: 'postgres',
				host: configService.getOrThrow('DATABASE_HOST'),
				port: configService.getOrThrow('DATABASE_PORT'),
				database: configService.getOrThrow('DATABASE_NAME'),
				username: configService.getOrThrow('DATABASE_USERNAME'),
				password: configService.getOrThrow('DATABASE_PASSWORD'),
				entities,
				migrations,
				migrationsTableName: 'migrations',
				migrationsRun: true,
				logging: false,
				ssl: process.env.NODE_ENV === 'production',
				extra: {
					connectionLimit: 10,
					...(process.env.NODE_ENV === 'production' ? {
						ssl: {
							rejectUnauthorized: false
						}
					} : {})
				},
			}),
			inject: [ConfigService],
		}),
	],
	exports: [TypeOrmModule],
})
export class DatabaseModule { }