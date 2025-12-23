import { SystemSetting } from '@/types/settings';
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface SettingsState {
	settings: SystemSetting | null;
	setSettings: (settings: SystemSetting | null) => void;

}

export const useSettingsStore = create<SettingsState>()(
	devtools(
		persist(
			(set) => ({
				settings: null,
				setSettings: (settings) => set({ settings }),
			}),
			{
				name: 'settings-storage',
				partialize: (state) => ({ settings: state.settings }),
			}
		),
		{
			name: 'settings-store',
		}
	)
);