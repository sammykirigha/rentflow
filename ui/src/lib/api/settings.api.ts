import type { SystemSetting } from '@/types/settings';
import apiClient from '.';

// System Settings API
export const getSettings = async (): Promise<SystemSetting> => {
  const response = await apiClient.get('/settings');
  return response.data;
};

export const updateSettings = async (data: Partial<SystemSetting>): Promise<SystemSetting> => {
  const response = await apiClient.patch('/settings', data);
  return response.data;
};

const settingsApi = {
  // Settings
  getSettings,
  updateSettings,
};

export default settingsApi;
