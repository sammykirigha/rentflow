import type { GetSettingsResponse, SystemSetting, UpdateSettingsResponse } from '@/types/settings';
import apiClient from '.';

// System Settings API
export const getSettings = async (): Promise<SystemSetting> => {
  const response = await apiClient.get<GetSettingsResponse>('/settings');
  return response.data.data;
};

export const updateSettings = async (data: Partial<SystemSetting>): Promise<SystemSetting> => {
  const response = await apiClient.patch<UpdateSettingsResponse>('/settings', data);
  return response.data.data;
};

const settingsApi = {
  // Settings
  getSettings,
  updateSettings,
};

export default settingsApi;
