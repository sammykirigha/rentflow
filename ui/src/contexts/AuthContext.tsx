/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useSettings } from '@/hooks/useSettings';
import { userApi } from '@/lib/api/user.api';
import { useUserStore } from '@/stores/user.store';
import { User } from '@/types/users';
import { SessionProvider, signIn, signOut, useSession } from 'next-auth/react';
import { createContext, useContext, useEffect, useState } from 'react';

interface AuthContextType {
	user: User | null;
	login: (email: string, password: string, redirect?: boolean) => Promise<{ success: boolean; error?: string; }>;
	logout: (redirect?: boolean) => Promise<void>;
	loading: boolean;
	isAuthenticated: boolean;
	fetchUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode; }) {

	useSettings();

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
			} catch (error: any) {
				logout(false);
			} finally {
				setUserLoading(false);
			}
		} else {
			// Clear user data when no session
			clearUser();
			sessionStorage.removeItem('access_token');
		}
	};

	// Fetch user data when session is available
	useEffect(() => {

		if (status !== 'loading') {
			fetchUserData();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [session, status]);

	const login = async (email: string, password: string, redirect?: boolean) => {
		try {
			setLoading(true);
			const result = await signIn('credentials', {
				email,
				password,
				redirect: false,
			});
			setLoading(false);

			if (result?.error) {
				return { success: false, error: 'Invalid credentials or account not active. Please contact support if assistance needed' };
			}

			if (result?.ok) {
				// if (redirect) {
				// 	router.push(user?.isAdminUser ? '/admin' : '/app');
				// }
				return { success: true };
			}

			return { success: false, error: 'Login failed' };
		} catch (error) {
			console.error('Login error:', error);
			return { success: false, error: 'An unexpected error occurred' };
		} finally {
			setLoading(false);
		}
	};

	const logout = async (redirect = true) => {
		// Clear user store before signing out
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