import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { SmsModule } from '../sms/sms.module';
import { MailModule } from '../mail/mail.module';
import { TenantsModule } from '../tenants/tenants.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { Notification } from './entities/notification.entity';
import { NotificationsController } from './notifications.controller';
import { NotificationsRepository } from './notifications.repository';
import { NotificationsService } from './notifications.service';
import { NotificationRetryService } from './notification-retry.service';

@Module({
	imports: [
		TypeOrmModule.forFeature([Notification]),
		AuditModule,
		SmsModule,
		MailModule,
		TenantsModule,
		InvoicesModule,
	],
	controllers: [NotificationsController],
	providers: [NotificationsService, NotificationsRepository, NotificationRetryService],
	exports: [NotificationsService, NotificationsRepository],
})
export class NotificationsModule {}
