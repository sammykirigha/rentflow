import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrgContextModule } from '@/common/services/org-context.module';
import { AuditModule } from '@/modules/audit/audit.module';
import { SmsModule } from '@/modules/sms/sms.module';
import { MailModule } from '@/modules/mail/mail.module';
import { RentEscalation } from './entities/rent-escalation.entity';
import { RentEscalationsController } from './rent-escalations.controller';
import { RentEscalationsService } from './rent-escalations.service';

@Module({
	imports: [
		TypeOrmModule.forFeature([RentEscalation]),
		OrgContextModule,
		AuditModule,
		SmsModule,
		MailModule,
	],
	controllers: [RentEscalationsController],
	providers: [RentEscalationsService],
	exports: [RentEscalationsService],
})
export class RentEscalationsModule {}
