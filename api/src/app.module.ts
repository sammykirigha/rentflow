import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import * as Joi from 'joi';

import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { DatabaseModule } from './database/database.module';
import { AdminModule } from './modules/admin/admin.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { LoggingModule } from './modules/logging/logging.module';
import { MailModule } from './modules/mail/mail.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { PropertiesModule } from './modules/properties/properties.module';
import { SettingsModule } from './modules/settings/settings.module';
import { StorageModule } from './modules/storage/storage.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { UnitsModule } from './modules/units/units.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { ReceiptsModule } from './modules/receipts/receipts.module';
import { UsersModule } from './modules/users/users.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { VendorsModule } from './modules/vendors/vendors.module';
import { MaintenanceModule } from './modules/maintenance/maintenance.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { MpesaModule } from './modules/mpesa/mpesa.module';
import { SmsModule } from './modules/sms/sms.module';

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			validationSchema: Joi.object({
				PORT: Joi.number().required(),
				API_PREFIX: Joi.string(),

				DATABASE_HOST: Joi.string().required(),
				DATABASE_PORT: Joi.number().required(),
				DATABASE_USERNAME: Joi.string().required(),
				DATABASE_PASSWORD: Joi.string().required(),
				DATABASE_NAME: Joi.string().required(),

				ENCRYPTION_KEY: Joi.string().required(),

				JWT_SECRET: Joi.string().required(),

				JWT_EXPIRES_IN: Joi.string().required(),
				JWT_REFRESH_SECRET: Joi.string().required(),
				JWT_REFRESH_EXPIRES_IN: Joi.string().required(),

				AWS_ACCESS_KEY_ID: Joi.string().required(),
				AWS_SECRET_ACCESS_KEY: Joi.string().required(),
				AWS_REGION: Joi.string().required(),
				AWS_S3_BUCKET: Joi.string().required(),

				RESEND_API_KEY: Joi.string().optional(),
				MAIL_FROM: Joi.string().optional(),

				AT_API_KEY: Joi.string().optional(),
				AT_USERNAME: Joi.string().optional(),

				MPESA_CONSUMER_KEY: Joi.string().required(),
				MPESA_CONSUMER_SECRET: Joi.string().required(),
				MPESA_PASSKEY: Joi.string().required(),
				MPESA_SHORTCODE: Joi.string().required(),
				MPESA_CALLBACK_BASE_URL: Joi.string().required(),
				MPESA_ENVIRONMENT: Joi.string().valid('sandbox', 'production').required(),

				FRONTEND_URL: Joi.string().required(),
				BACKEND_URL: Joi.string().required(),

				THROTTLE_TTL: Joi.number().required(),
				THROTTLE_LIMIT: Joi.number().required(),

			})
		}),

		// Rate limiting
		ThrottlerModule.forRootAsync({
			imports: [ConfigModule],
			useFactory: (configService: ConfigService) => ({
				ttl: parseInt(configService.get('THROTTLE_TTL', '60000'), 10),
				limit: parseInt(configService.get('THROTTLE_LIMIT', '100'), 10),
			}),
			inject: [ConfigService],
		}),

		ScheduleModule.forRoot(),
		UsersModule,
		PermissionsModule,
		PropertiesModule,
		UnitsModule,
		TenantsModule,
		DatabaseModule,
		LoggingModule,
		MailModule,
		AuditModule,
		StorageModule,
		AuthModule,
		SettingsModule,
		AdminModule,
		InvoicesModule,
		PaymentsModule,
		WalletModule,
		ReceiptsModule,
		ExpensesModule,
		VendorsModule,
		MaintenanceModule,
		NotificationsModule,
		DashboardModule,
		SmsModule,
		MpesaModule,
	],
	providers: [
		// Global guards
		{
			provide: APP_GUARD,
			useClass: ThrottlerGuard,
		},
		// Global filters
		{
			provide: APP_FILTER,
			useClass: HttpExceptionFilter,
		},
		// Global interceptors
		{
			provide: APP_INTERCEPTOR,
			useClass: LoggingInterceptor,
		},
		{
			provide: APP_INTERCEPTOR,
			useClass: TransformInterceptor,
		},
	],
})
export class AppModule { }