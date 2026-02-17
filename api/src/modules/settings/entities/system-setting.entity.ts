import { AbstractEntity } from '@/database/abstract.entity';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('system_settings')
export class SystemSetting extends AbstractEntity<SystemSetting> {
  @PrimaryGeneratedColumn('uuid', { name: 'system_setting_id' })
  systemSettingId: string;

  // General Settings
  @Column({ name: 'platform_name', default: 'RentFlow' })
  platformName: string;

  @Column({ name: 'support_email', default: 'support@rentflow.co.ke' })
  supportEmail: string;

  // Branding Settings
  @Column({ name: 'app_logo', type: 'varchar', length: 500, nullable: true })
  appLogo?: string;

  @Column({ name: 'app_favicon', type: 'varchar', length: 500, nullable: true })
  appFavicon?: string;

  // Contact Information
  @Column({ name: 'contact_phone', type: 'varchar', length: 20, nullable: true })
  contactPhone?: string;

  @Column({ name: 'contact_address', type: 'text', nullable: true })
  contactAddress?: string;

  // File Upload Settings
  @Column({ name: 'max_file_upload_size', type: 'integer', default: 10 })
  maxFileUploadSize: number;

  @Column({ name: 'allowed_file_types', type: 'simple-array', nullable: true })
  allowedFileTypes?: string[];

  // User Signup Settings
  @Column({ name: 'allow_signup', type: 'boolean', default: false })
  allowSignup: boolean;

  @Column({ name: 'require_verification', type: 'boolean', default: false })
  requireVerification: boolean;

  // Notification Settings
  @Column({ name: 'email_notifications', type: 'boolean', default: true })
  emailNotifications: boolean;

  @Column({ name: 'sms_notifications', type: 'boolean', default: true })
  smsNotifications: boolean;

  @Column({ name: 'admin_alerts', type: 'boolean', default: true })
  adminAlerts: boolean;

  // Helper methods
  getFileUploadSizeInMB(): string {
    return `${this.maxFileUploadSize} MB`;
  }

  getAllowedFileTypesString(): string {
    return this.allowedFileTypes?.join(', ') || 'No restrictions';
  }
}
