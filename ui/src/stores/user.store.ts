import { User } from '@/types/users';
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface UserState {
	user: User | null;
	isLoading: boolean;
	error: string | null;
	setUser: (user: User | null) => void;
	setLoading: (loading: boolean) => void;
	setError: (error: string | null) => void;
	clearUser: () => void;
}

export const useUserStore = create<UserState>()(
	devtools(
		persist(
			(set) => ({
				user: null,
				isLoading: false,
				error: null,
				setUser: (user) => set({ user, error: null }),
				setLoading: (isLoading) => set({ isLoading }),
				setError: (error) => set({ error }),
				clearUser: () => set({ user: null, error: null }),
			}),
			{
				name: 'user-storage',
				partialize: (state) => ({ user: state.user }),
				migrate: (persistedState) => persistedState
			}
		),
		{
			name: 'user-store',
		}
	)
);