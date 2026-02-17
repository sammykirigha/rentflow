import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
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
