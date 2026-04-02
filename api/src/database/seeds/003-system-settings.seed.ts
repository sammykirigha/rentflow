import { Organization } from '@/modules/organizations/entities/organization.entity';
import { SystemSetting } from '@/modules/settings/entities/system-setting.entity';
import { DataSource } from 'typeorm';

export class SystemSettingsSeed {
  public async run(dataSource: DataSource): Promise<void> {
    console.log('Seeding RentFlow system settings...');

    const orgRepository = dataSource.getRepository(Organization);
    const defaultOrg = await orgRepository.findOne({ where: { slug: 'default' } });

    if (!defaultOrg) {
      console.error('  Default organization not found. Run initial users seed first.');
      return;
    }

    const systemSettingsRepository = dataSource.getRepository(SystemSetting);

    const existingSettings = await systemSettingsRepository.findOne({
      where: { organizationId: defaultOrg.organizationId },
    });

    if (!existingSettings) {
      const defaultSettings = systemSettingsRepository.create({
        organizationId: defaultOrg.organizationId,
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
