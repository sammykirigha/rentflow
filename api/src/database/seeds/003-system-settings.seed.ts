import { SystemSetting } from '@/modules/settings/entities/system-setting.entity';
import { DataSource } from 'typeorm';

export class SystemSettingsSeed {
  public async run(dataSource: DataSource): Promise<void> {
    console.log('Seeding RentFlow system settings...');

    const systemSettingsRepository = dataSource.getRepository(SystemSetting);

    const existingSettings = await systemSettingsRepository.findOne({ where: {} });

    if (!existingSettings) {
      const defaultSettings = systemSettingsRepository.create({
        platformName: 'RentFlow',
        supportEmail: 'support@rentflow.co.ke',
        emailNotifications: true,
        smsNotifications: true,
        adminAlerts: true,
        requireVerification: false,
        allowSignup: false,
      });

      await systemSettingsRepository.save(defaultSettings);
      console.log('  System settings created successfully');
    } else {
      console.log('  System settings already exist, skipping...');
    }

    console.log('System settings seeding completed');
  }
}
