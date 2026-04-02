import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from '@/modules/tenants/entities/tenant.entity';
import { Unit } from '@/modules/units/entities/unit.entity';
import { Notification } from '@/modules/notifications/entities/notification.entity';
import { AuditModule } from '@/modules/audit/audit.module';
import { SmsModule } from '@/modules/sms/sms.module';
import { MailModule } from '@/modules/mail/mail.module';
import { LeaseLifecycleService } from './lease-lifecycle.service';

@Module({
	imports: [
		TypeOrmModule.forFeature([Tenant, Unit, Notification]),
		AuditModule,
		SmsModule,
		MailModule,
	],
	providers: [LeaseLifecycleService],
	exports: [LeaseLifecycleService],
})
export class LeaseLifecycleModule {}
