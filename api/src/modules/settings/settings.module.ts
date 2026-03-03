import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { UsersModule } from '../users/users.module';
import { SystemSetting } from './entities/system-setting.entity';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { SystemSettingsRepository } from './system-settings.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SystemSetting,
    ]),
    AuditModule,
    UsersModule,
    forwardRef(() => InvoicesModule),
  ],
  controllers: [SettingsController],
  providers: [
    SystemSettingsRepository,
    SettingsService,
  ],
  exports: [
    SettingsService,
  ],
})
export class SettingsModule { }
