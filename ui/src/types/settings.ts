// Settings Types

export interface RecurringCharge {
  name: string;
  amount: number;
  enabled: boolean;
}

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

  // File Upload Settings
  maxFileUploadSize: number;
  allowedFileTypes?: string[];

  // User Settings
  allowSignup: boolean;
  requireVerification: boolean;

  // Notification Settings
  emailNotifications: boolean;
  smsNotifications: boolean;
  adminAlerts: boolean;

  // Invoice Settings
  recurringCharges: RecurringCharge[];

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
