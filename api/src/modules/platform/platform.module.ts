import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from '../permissions/entities/role.entity';
import { User } from '../users/entities/user.entity';
import { AuditModule } from '../audit/audit.module';
import { MailModule } from '../mail/mail.module';
import { Organization } from '../organizations/entities/organization.entity';
import { OrganizationsModule } from '../organizations/organizations.module';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { PlatformConfig } from './entities/platform-config.entity';
import { PlatformController } from './platform.controller';
import { PlatformService } from './platform.service';

@Module({
	imports: [
		TypeOrmModule.forFeature([Organization, Subscription, PlatformConfig, User, Role]),
		OrganizationsModule,
		SubscriptionsModule,
		AuditModule,
		MailModule,
		JwtModule.register({}),
	],
	controllers: [PlatformController],
	providers: [PlatformService],
	exports: [PlatformService],
})
export class PlatformModule {}
