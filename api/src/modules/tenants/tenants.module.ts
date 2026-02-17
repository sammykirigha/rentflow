import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from '@/modules/permissions/entities/role.entity';
import { Unit } from '@/modules/units/entities/unit.entity';
import { Notification } from '@/modules/notifications/entities/notification.entity';
import { AuditModule } from '../audit/audit.module';
import { UsersModule } from '../users/users.module';
import { UnitsModule } from '../units/units.module';
import { SmsModule } from '../sms/sms.module';
import { MailModule } from '../mail/mail.module';
import { Tenant } from './entities/tenant.entity';
import { TenantsController } from './tenants.controller';
import { TenantsRepository } from './tenants.repository';
import { TenantsService } from './tenants.service';

@Module({
	imports: [
		TypeOrmModule.forFeature([Tenant, Unit, Role, Notification]),
		AuditModule,
		forwardRef(() => UsersModule),
		forwardRef(() => UnitsModule),
		SmsModule,
		MailModule,
	],
	controllers: [TenantsController],
	providers: [TenantsService, TenantsRepository],
	exports: [TenantsService, TenantsRepository],
})
export class TenantsModule {}
