import { parseError } from '@/lib/api/parseError';
import * as settingsApi from '@/lib/api/settings.api';
import { useSettingsStore } from '@/stores/settings.store';
import type { SystemSetting } from '@/types/settings';
import { ApiErrorResponse } from '@/types';
import { useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { toast } from 'react-toastify';

// Query Keys
export const SETTINGS_QUERY_KEYS = {
	all: ['settings'] as const,
	settings: () => [...SETTINGS_QUERY_KEYS.all, 'system'] as const,
};

export const useSettings = (): UseQueryResult<SystemSetting> => {
	const setSettings = useSettingsStore(state => state.setSettings);
	return useQuery({
		queryKey: SETTINGS_QUERY_KEYS.settings(),
		queryFn: async () => {
			const response = await settingsApi.getSettings();
			setSettings(response);

			return response;
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes
	});
};

export const useUpdateSettings = (): UseMutationResult<SystemSetting, ApiErrorResponse, Partial<SystemSetting>> => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: settingsApi.updateSettings,
		onSuccess: () => {
			toast.success('Settings updated successfully');
			queryClient.invalidateQueries({ queryKey: SETTINGS_QUERY_KEYS.settings() });
		},
		onError: (error) => {
			toast.error(parseError(error, 'Failed to update settings'));
		},
	});
};
