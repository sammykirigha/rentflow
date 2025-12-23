// Settings Types
import { AiModelConfiguration } from './ai-models';

export interface SystemSetting {
  systemSettingId: number;
  platformName: string;
  supportEmail: string;

  // Branding Settings
  appLogo?: string;
  appFavicon?: string;

  // Contact Information
  contactPhone?: string;
  contactAddress?: string;

  // Social Media Links
  socialFacebook?: string;
  socialTwitter?: string;
  socialLinkedin?: string;
  socialInstagram?: string;

  // File Upload Settings
  maxFileUploadSize: number;
  allowedFileTypes?: string[];

  // AI Model Settings
  defaultAiModelId?: number;
  defaultAiModel?: AiModelConfiguration;

  // User Settings
  allowSignup: boolean;
  requireVerification: boolean;

  // Notification Settings
  emailNotifications: boolean;
  smsNotifications: boolean;
  adminAlerts: boolean;

  createdAt: string;
  updatedAt: string;
}

// API Response types
export interface GetSettingsResponse {
  success: boolean;
  message: string;
  data: SystemSetting;
}

export interface UpdateSettingsResponse {
  success: boolean;
  message: string;
  data: SystemSetting;
}

// Settings form sections
export interface BrandingSettings {
  platformName: string;
  appLogo?: string;
  appFavicon?: string;
}

export interface ContactSettings {
  supportEmail: string;
  contactPhone?: string;
  contactAddress?: string;
}

export interface SocialMediaSettings {
  socialFacebook?: string;
  socialTwitter?: string;
  socialLinkedin?: string;
  socialInstagram?: string;
}

export interface FileUploadSettings {
  maxFileUploadSize: number;
  allowedFileTypes?: string[];
}

export interface UserSettings {
  allowSignup: boolean;
  requireVerification: boolean;
}

export interface NotificationSettings {
  emailNotifications: boolean;
  smsNotifications: boolean;
  adminAlerts: boolean;
}

// Settings validation
export const SETTINGS_VALIDATION = {
  platformName: {
    required: true,
    minLength: 1,
    maxLength: 255,
  },
  supportEmail: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  appLogo: {
    required: false,
    maxLength: 500,
    pattern: /^https?:\/\/.+/,
  },
  appFavicon: {
    required: false,
    maxLength: 500,
    pattern: /^https?:\/\/.+/,
  },
  contactPhone: {
    required: false,
    maxLength: 20,
    pattern: /^[\+]?[1-9][\d]{0,15}$/,
  },
  contactAddress: {
    required: false,
    maxLength: 500,
  },
  socialFacebook: {
    required: false,
    maxLength: 200,
    pattern: /^https?:\/\/(www\.)?facebook\.com\/.+/,
  },
  socialTwitter: {
    required: false,
    maxLength: 200,
    pattern: /^https?:\/\/(www\.)?twitter\.com\/.+/,
  },
  socialLinkedin: {
    required: false,
    maxLength: 200,
    pattern: /^https?:\/\/(www\.)?linkedin\.com\/.+/,
  },
  socialInstagram: {
    required: false,
    maxLength: 200,
    pattern: /^https?:\/\/(www\.)?instagram\.com\/.+/,
  },
  maxFileUploadSize: {
    required: true,
    min: 1,
    max: 100,
  },
};
