import { AbstractEntity } from '@/database/abstract.entity';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { AiModelConfiguration } from './ai-model-configuration.entity';

@Entity('system_settings')
export class SystemSetting extends AbstractEntity<SystemSetting> {
  @PrimaryGeneratedColumn('uuid', { name: 'system_setting_id' })
  systemSettingId: string;

  // General Settings
  @Column({ name: 'platform_name', default: 'Edu AI Platform' })
  platformName: string;

  @Column({ name: 'support_email', default: 'support@eduai.com' })
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

  // Social Media Links
  @Column({ name: 'social_facebook', type: 'varchar', length: 200, nullable: true })
  socialFacebook?: string;

  @Column({ name: 'social_twitter', type: 'varchar', length: 200, nullable: true })
  socialTwitter?: string;

  @Column({ name: 'social_linkedin', type: 'varchar', length: 200, nullable: true })
  socialLinkedin?: string;

  @Column({ name: 'social_instagram', type: 'varchar', length: 200, nullable: true })
  socialInstagram?: string;

  // File Upload Settings
  @Column({ name: 'max_file_upload_size', type: 'integer', default: 10 })
  maxFileUploadSize: number;

  @Column({ name: 'allowed_file_types', type: 'simple-array', nullable: true })
  allowedFileTypes?: string[];

  // AI Model Settings
  @Column({ name: 'default_ai_model_id', type: 'integer', nullable: true })
  defaultAiModelId?: number;

  @ManyToOne(() => AiModelConfiguration)
  @JoinColumn({ name: 'default_ai_model_id', referencedColumnName: 'modelId' })
  defaultAiModel?: AiModelConfiguration;

  // User Signup Settings
  @Column({ name: 'allow_signup', type: 'boolean', default: false })
  allowSignup: boolean;

  @Column({ name: 'require_verification', type: 'boolean', default: false })
  requireVerification: boolean;

  // Notification Settings
  @Column({ name: 'email_notifications', type: 'boolean', default: true })
  emailNotifications: boolean;

  @Column({ name: 'sms_notifications', type: 'boolean', default: false })
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

  hasDefaultAiModel(): boolean {
    return !!this.defaultAiModelId;
  }
}
