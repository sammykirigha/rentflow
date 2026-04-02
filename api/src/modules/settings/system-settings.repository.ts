import { OrgScopedRepository } from '@/database/org-scoped.repository';
import { OrgContextService } from '@/common/services/org-context.service';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemSetting } from './entities/system-setting.entity';

@Injectable()
export class SystemSettingsRepository extends OrgScopedRepository<SystemSetting> {
  constructor(
    @InjectRepository(SystemSetting)
    systemSettingsRepository: Repository<SystemSetting>,
    orgContext: OrgContextService,
  ) {
    super(systemSettingsRepository, orgContext);
  }

  /**
   * Get the system settings for the current org
   */
  async getSettings(): Promise<SystemSetting | null> {
    const settings = await this.findAll({ take: 1 });
    return settings[0] || null;
  }

  /**
   * Get or create default system settings for the current org
   */
  async getOrCreateSettings(): Promise<SystemSetting> {
    let settings = await this.getSettings();

    if (!settings) {
      settings = await this.create({
        platformName: 'RentFlow',
        supportEmail: 'support@rentflow.co.ke',
        emailNotifications: true,
        smsNotifications: true,
        adminAlerts: true,
        requireVerification: false,
      } as any);
    }

    return settings;
  }

  /**
   * Update system settings
   */
  async updateSettings(id: string, updateData: Partial<SystemSetting>): Promise<SystemSetting | null> {
    return this.update({ systemSettingId: id } as any, updateData as any);
  }
}
