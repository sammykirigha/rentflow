import { SystemSetting } from '@/modules/settings/entities/system-setting.entity';
import { DataSource } from 'typeorm';

export class SystemSettingsSeed {
  public async run(dataSource: DataSource): Promise<void> {
    console.log('🌱 Seeding system settings...');
    
    const systemSettingsRepository = dataSource.getRepository(SystemSetting);

    // Check if system settings already exist
    const existingSettings = await systemSettingsRepository.findOne({ where: {} });
    
    if (!existingSettings) {
      // Create default system settings
      // const defaultSettings = systemSettingsRepository.create({
      //   platformName: 'Edu AI Platform',
      //   supportEmail: 'support@eduai.com',
      //   emailNotifications: true,
      //   smsNotifications: false,
      //   adminAlerts: true,
      //   requireVerification: true,
      // });
      
      // await systemSettingsRepository.save(defaultSettings);
      console.log('✅ System settings created successfully');
    } else {
      console.log('⏭️  System settings already exist, skipping...');
    }

    console.log('✅ System settings seeding completed');
  }
}