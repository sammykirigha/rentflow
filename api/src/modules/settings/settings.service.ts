import { AuditAction } from '@/common/enums/audit-action.enum';
import { AuditTargetType } from '@/common/enums/audit-target-type.enum';
import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { UpdateSystemSettingsDto } from './dto/update-system-settings.dto';
import { SystemSetting } from './entities/system-setting.entity';
import { SystemSettingsRepository } from './system-settings.repository';

@Injectable()
export class SettingsService {
  constructor(
    private readonly systemSettingsRepository: SystemSettingsRepository,
    private readonly auditService: AuditService,
  ) { }

  /**
   * Get system settings (creates default if doesn't exist)
   */
  async getSettings(): Promise<SystemSetting> {
    return this.systemSettingsRepository.getOrCreateSettings();
  }

  /**
   * Update system settings
   */
  async updateSettings(
    updateDto: UpdateSystemSettingsDto,
    adminId?: string,
    adminName?: string,
    ipAddress?: string,
  ): Promise<SystemSetting> {
    const settings = await this.systemSettingsRepository.getOrCreateSettings();

    if (!settings) {
      throw new NotFoundException('System settings not found');
    }

    const updatedSettings = await this.systemSettingsRepository.updateSettings(
      settings.systemSettingId,
      updateDto,
    );

    if (!updatedSettings) {
      throw new NotFoundException('Failed to update settings');
    }

    // Create audit log for settings update
    if (adminId && adminName) {
      const changedFields = Object.keys(updateDto).filter(
        key => updateDto[key] !== undefined
      );

      await this.auditService.createLog({
        performedBy: adminId,
        performerName: adminName,
        action: AuditAction.SETTINGS_UPDATED,
        targetType: AuditTargetType.SETTINGS,
        targetId: settings.systemSettingId,
        details: `System settings updated: ${changedFields.join(', ')}`,
        ipAddress,
        metadata: {
          settingsId: settings.systemSettingId,
          updatedFields: changedFields,
          newValues: updateDto,
        },
      });
    }

    return updatedSettings;
  }
}
