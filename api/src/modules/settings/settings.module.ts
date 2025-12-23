import { EncryptionService } from '@/common/services/encryption.service';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { UsersModule } from '../users/users.module';
import { AiModelConfigurationRepository } from './ai-model-configuration.repository';
import { AiModelConfigurationService } from './ai-model-configuration.service';
import { AiModelConfiguration } from './entities/ai-model-configuration.entity';
import { SystemSetting } from './entities/system-setting.entity';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { SystemSettingsRepository } from './system-settings.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SystemSetting,
      AiModelConfiguration,
    ]),
    AuditModule,
    UsersModule,
  ],
  controllers: [SettingsController],
  providers: [
    EncryptionService,
    SystemSettingsRepository,
    AiModelConfigurationRepository,
    SettingsService,
    AiModelConfigurationService,
  ],
  exports: [
    SettingsService,
    AiModelConfigurationService,
  ],
})
export class SettingsModule { }
