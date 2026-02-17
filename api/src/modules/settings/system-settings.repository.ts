import { AbstractRepository } from '@/database/abstract.repository';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemSetting } from './entities/system-setting.entity';

@Injectable()
export class SystemSettingsRepository extends AbstractRepository<SystemSetting> {
  constructor(
    @InjectRepository(SystemSetting)
    systemSettingsRepository: Repository<SystemSetting>,
  ) {
    super(systemSettingsRepository);
  }

  /**
   * Get the system settings (there should only be one record)
   */
  async getSettings(): Promise<SystemSetting | null> {
    const settings = await this.repository.find({ take: 1 });
    return settings[0] || null;
  }

  /**
   * Get or create default system settings
   */
  async getOrCreateSettings(): Promise<SystemSetting> {
    let settings = await this.getSettings();

    if (!settings) {
      // Create default settings
      settings = this.repository.create({
        platformName: 'RentFlow',
        supportEmail: 'support@rentflow.co.ke',
        emailNotifications: true,
        smsNotifications: true,
        adminAlerts: true,
        requireVerification: false,
      });
      settings = await this.repository.save(settings);
    }

    return settings;
  }

  /**
   * Update system settings
   */
  async updateSettings(id: string, updateData: Partial<SystemSetting>): Promise<SystemSetting | null> {
    await this.repository.update(id, updateData);
    return this.findOne({ where: { systemSettingId: id } });
  }
}
