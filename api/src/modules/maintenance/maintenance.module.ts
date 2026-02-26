import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { MailModule } from '../mail/mail.module';
import { Expense } from '../expenses/entities/expense.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { Role } from '../permissions/entities/role.entity';
import { Property } from '../properties/entities/property.entity';
import { SmsModule } from '../sms/sms.module';
import { Tenant } from '../tenants/entities/tenant.entity';
import { User } from '../users/entities/user.entity';
import { MaintenanceRequest } from './entities/maintenance-request.entity';
import { MaintenanceController } from './maintenance.controller';
import { MaintenanceRepository } from './maintenance.repository';
import { MaintenanceService } from './maintenance.service';

@Module({
	imports: [
		TypeOrmModule.forFeature([MaintenanceRequest, Tenant, User, Role, Notification, Expense, Property]),
		AuditModule,
		SmsModule,
		MailModule,
	],
	controllers: [MaintenanceController],
	providers: [MaintenanceService, MaintenanceRepository],
	exports: [MaintenanceService, MaintenanceRepository],
})
export class MaintenanceModule {}
