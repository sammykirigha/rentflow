'use client';

import { userApi } from '@/lib/api/user.api';
import { useUserStore } from '@/stores/user.store';
import { User } from '@/types/users';
import { SessionProvider, signIn, signOut, useSession } from 'next-auth/react';
import { createContext, useContext, useEffect, useState } from 'react';

interface AuthContextType {
	user: User | null;
	login: (email: string, password: string) => Promise<{ success: boolean; error?: string; }>;
	logout: (redirect?: boolean) => Promise<void>;
	loading: boolean;
	isAuthenticated: boolean;
	fetchUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode; }) {
	return (
		<SessionProvider>
			<AuthContextProvider>{children}</AuthContextProvider>
		</SessionProvider>
	);
}

function AuthContextProvider({ children }: { children: React.ReactNode; }) {
	const { data: session, status } = useSession();
	const [loading, setLoading] = useState(true);

	const user = useUserStore(state => state.user);
	const setUser = useUserStore(state => state.setUser);
	const setUserLoading = useUserStore(state => state.setLoading);
	const isLoadingUser = useUserStore(state => state.isLoading);
	const clearUser = useUserStore(state => state.clearUser);

	useEffect(() => {
		setLoading(status === 'loading');
	}, [status]);

	const fetchUserData = async () => {
		if (session?.user && session.accessToken) {
			try {
				setUserLoading(true);
				sessionStorage.setItem('access_token', session.accessToken as string);

				const userData = await userApi.getCurrentUser();
				if (userData.userId) setUser(userData);
				else logout(false);
			} catch {
				logout(false);
			} finally {
				setUserLoading(false);
			}
		} else {
			clearUser();
			sessionStorage.removeItem('access_token');
		}
	};

	useEffect(() => {
		if (status !== 'loading') {
			fetchUserData();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [session, status]);

	const login = async (email: string, password: string) => {
		try {
			setLoading(true);
			const result = await signIn('credentials', {
				email,
				password,
				redirect: false,
			});
			setLoading(false);

			if (result?.error) {
				return { success: false, error: 'Invalid credentials or account not active.' };
			}

			if (result?.ok) {
				return { success: true };
			}

			return { success: false, error: 'Login failed' };
		} catch {
			return { success: false, error: 'An unexpected error occurred' };
		} finally {
			setLoading(false);
		}
	};

	const logout = async (redirect = true) => {
		clearUser();
		sessionStorage.removeItem('access_token');
		await signOut({ callbackUrl: '/login', redirect });
	};

	const value = {
		user,
		login,
		logout,
		loading: loading || isLoadingUser,
		isAuthenticated: !!session?.user,
		fetchUserData
	};

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
	const context = useContext(AuthContext);
	if (context === undefined) {
		throw new Error('useAuth must be used within an AuthProvider');
	}
	return context;
}
