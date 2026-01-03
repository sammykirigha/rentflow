import { userApi } from '@/lib/api/user.api';
import { getCurrentUser } from '@/lib/session';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PropsWithChildren } from 'react';

export const metadata: Metadata = {
	title: 'Onboarding | GetAISEO',
	description: 'Complete your onboarding to get started',
	robots: {
		index: false,
		follow: false,
	},
};

export default async function OnboardingLayout({ children }: PropsWithChildren) {
	const currentUser = await getCurrentUser();

	if (!currentUser) {
		return redirect('/login');
	}

	// check if user is already onboarded
	let isOnboarded = false;
	try {
		const userData = await userApi.checkIfOnboarded(currentUser.userId);
		if (userData.isOnboarded) {
			isOnboarded = true;
		}
	} catch (e) {
		console.log("Error checking is user is onboarded", e);
	}

	if (isOnboarded) return redirect('/dashboard');

	return (
		<div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50">
			{children}
		</div>
	);
}
