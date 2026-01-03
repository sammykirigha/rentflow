'use client';

import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { userApi } from '@/lib/api/user.api';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Key, Loader2, Lock, Unlink } from 'lucide-react';
import { signIn } from 'next-auth/react';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

// Schema for setting password (no current password required)
const setPasswordSchema = z.object({
	newPassword: z.string().min(6, 'Password must be at least 6 characters'),
	confirmPassword: z.string().min(6, 'Password must be at least 6 characters'),
}).refine((data) => data.newPassword === data.confirmPassword, {
	message: "Passwords don't match",
	path: ["confirmPassword"],
});

// Schema for changing password (requires current password)
const changePasswordSchema = z.object({
	currentPassword: z.string().min(1, 'Current password is required'),
	newPassword: z.string().min(6, 'Password must be at least 6 characters'),
	confirmPassword: z.string().min(6, 'Password must be at least 6 characters'),
}).refine((data) => data.newPassword === data.confirmPassword, {
	message: "Passwords don't match",
	path: ["confirmPassword"],
});

type SetPasswordForm = z.infer<typeof setPasswordSchema>;
type ChangePasswordForm = z.infer<typeof changePasswordSchema>;

function GoogleIcon({ className = "w-5 h-5" }: { className?: string; }) {
	return (
		<svg
			className={className}
			viewBox="0 0 18 18"
			xmlns="http://www.w3.org/2000/svg"
		>
			<path
				d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
				fill="#4285F4"
			/>
			<path
				d="M9.003 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9.003 18z"
				fill="#34A853"
			/>
			<path
				d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
				fill="#FBBC05"
			/>
			<path
				d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.428 0 9.002 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29c.708-2.127 2.692-3.71 5.036-3.71z"
				fill="#EA4335"
			/>
		</svg>
	);
}

export default function SecuritySettings() {
	const [authStatus, setAuthStatus] = useState<{
		hasPassword: boolean;
		hasGoogleConnected: boolean;
	} | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
	const [isDisconnectingGoogle, setIsDisconnectingGoogle] = useState(false);
	const [showCurrentPassword, setShowCurrentPassword] = useState(false);
	const [showNewPassword, setShowNewPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);

	const fetchAuthStatus = useCallback(async () => {
		try {
			const status = await userApi.getAuthStatus();
			setAuthStatus(status);
		} catch (error) {
			console.error('Failed to fetch auth status:', error);
			toast.error('Failed to load authentication status');
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchAuthStatus();
	}, [fetchAuthStatus]);

	// Set password form (for users without password)
	const setPasswordForm = useForm<SetPasswordForm>({
		resolver: zodResolver(setPasswordSchema),
		defaultValues: {
			newPassword: '',
			confirmPassword: '',
		},
	});

	// Change password form (for users with password)
	const changePasswordForm = useForm<ChangePasswordForm>({
		resolver: zodResolver(changePasswordSchema),
		defaultValues: {
			currentPassword: '',
			newPassword: '',
			confirmPassword: '',
		},
	});

	const onSetPassword = async (data: SetPasswordForm) => {
		setIsSubmitting(true);
		try {
			await userApi.setPassword(data.newPassword);
			toast.success('Password set successfully!');
			setPasswordForm.reset();
			fetchAuthStatus();
		} catch (error) {
			console.error('Set password error:', error);
			let errorMessage = 'Failed to set password. Please try again.';
			if (error && typeof error === 'object' && 'response' in error) {
				const axiosError = error as { response?: { data?: { message?: string; }; }; };
				errorMessage = axiosError.response?.data?.message || errorMessage;
			}
			toast.error(errorMessage);
		} finally {
			setIsSubmitting(false);
		}
	};

	const onChangePassword = async (data: ChangePasswordForm) => {
		setIsSubmitting(true);
		try {
			await userApi.changePassword({
				currentPassword: data.currentPassword,
				newPassword: data.newPassword,
			});
			toast.success('Password changed successfully!');
			changePasswordForm.reset();
		} catch (error) {
			console.error('Change password error:', error);
			let errorMessage = 'Failed to change password. Please try again.';
			if (error && typeof error === 'object' && 'response' in error) {
				const axiosError = error as { response?: { data?: { message?: string; }; }; };
				errorMessage = axiosError.response?.data?.message || errorMessage;
			}
			toast.error(errorMessage);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleConnectGoogle = async () => {
		setIsConnectingGoogle(true);
		try {
			// Redirect to Google OAuth - the callback will handle the connection
			await signIn('google', { callbackUrl: '/dashboard/profile?googleConnected=true' });
		} catch (error) {
			console.error('Connect Google error:', error);
			toast.error('Failed to connect Google account');
			setIsConnectingGoogle(false);
		}
	};

	const handleDisconnectGoogle = async () => {
		if (!authStatus?.hasPassword) {
			toast.error('Please set a password before disconnecting Google');
			return;
		}

		setIsDisconnectingGoogle(true);
		try {
			await userApi.disconnectGoogle();
			toast.success('Google account disconnected successfully');
			fetchAuthStatus();
		} catch (error) {
			console.error('Disconnect Google error:', error);
			let errorMessage = 'Failed to disconnect Google account';
			if (error && typeof error === 'object' && 'response' in error) {
				const axiosError = error as { response?: { data?: { message?: string; }; }; };
				errorMessage = axiosError.response?.data?.message || errorMessage;
			}
			toast.error(errorMessage);
		} finally {
			setIsDisconnectingGoogle(false);
		}
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-8">
				<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Google Account Connection */}
			<Card className="rounded-sm">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<GoogleIcon className="h-5 w-5" />
						Google Account
					</CardTitle>
					<CardDescription>
						{authStatus?.hasGoogleConnected
							? 'Your Google account is connected. You can sign in using Google.'
							: 'Connect your Google account for easier sign-in. Go to login page and login with Google to connect your account (ensure Google gmail is same as your registered email).'}
					</CardDescription>
				</CardHeader>
				<CardContent>
					{authStatus?.hasGoogleConnected ? (
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2 text-sm text-green-600">
								<div className="h-2 w-2 rounded-full bg-green-600" />
								Connected
							</div>
							<Button
								variant="outline"
								size="sm"
								onClick={handleDisconnectGoogle}
								disabled={isDisconnectingGoogle || !authStatus.hasPassword}
							>
								{isDisconnectingGoogle ? (
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								) : (
									<Unlink className="mr-2 h-4 w-4" />
								)}
								Disconnect
							</Button>
						</div>
					) : null}
					{authStatus?.hasGoogleConnected && !authStatus.hasPassword && (
						<p className="mt-2 text-sm text-muted-foreground">
							Set a password below before disconnecting Google to ensure you can still sign in.
						</p>
					)}
				</CardContent>
			</Card>

			{/* Password Management */}
			<Card className="rounded-sm">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Key className="h-5 w-5" />
						{authStatus?.hasPassword ? 'Change Password' : 'Set Password'}
					</CardTitle>
					<CardDescription>
						{authStatus?.hasPassword
							? 'Update your password to keep your account secure.'
							: 'Set a password to enable email/password sign-in.'}
					</CardDescription>
				</CardHeader>
				<CardContent>
					{authStatus?.hasPassword ? (
						// Change password form
						<Form {...changePasswordForm}>
							<form
								onSubmit={changePasswordForm.handleSubmit(onChangePassword)}
								className="space-y-4"
							>
								<FormField
									control={changePasswordForm.control}
									name="currentPassword"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Current Password</FormLabel>
											<FormControl>
												<div className="relative">
													<Input
														type={showCurrentPassword ? 'text' : 'password'}
														className="pl-10 pr-10"
														placeholder="Enter current password"
														{...field}
													/>
													<Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
													<button
														type="button"
														className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
														onClick={() => setShowCurrentPassword(!showCurrentPassword)}
													>
														{showCurrentPassword ? (
															<EyeOff className="w-5 h-5" />
														) : (
															<Eye className="w-5 h-5" />
														)}
													</button>
												</div>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={changePasswordForm.control}
									name="newPassword"
									render={({ field }) => (
										<FormItem>
											<FormLabel>New Password</FormLabel>
											<FormControl>
												<div className="relative">
													<Input
														type={showNewPassword ? 'text' : 'password'}
														className="pl-10 pr-10"
														placeholder="Enter new password"
														{...field}
													/>
													<Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
													<button
														type="button"
														className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
														onClick={() => setShowNewPassword(!showNewPassword)}
													>
														{showNewPassword ? (
															<EyeOff className="w-5 h-5" />
														) : (
															<Eye className="w-5 h-5" />
														)}
													</button>
												</div>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={changePasswordForm.control}
									name="confirmPassword"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Confirm New Password</FormLabel>
											<FormControl>
												<div className="relative">
													<Input
														type={showConfirmPassword ? 'text' : 'password'}
														className="pl-10 pr-10"
														placeholder="Confirm new password"
														{...field}
													/>
													<Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
													<button
														type="button"
														className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
														onClick={() => setShowConfirmPassword(!showConfirmPassword)}
													>
														{showConfirmPassword ? (
															<EyeOff className="w-5 h-5" />
														) : (
															<Eye className="w-5 h-5" />
														)}
													</button>
												</div>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<Button type="submit" disabled={isSubmitting}>
									{isSubmitting ? (
										<>
											<Loader2 className="mr-2 h-4 w-4 animate-spin" />
											Changing Password...
										</>
									) : (
										'Change Password'
									)}
								</Button>
							</form>
						</Form>
					) : (
						// Set password form
						<Form {...setPasswordForm}>
							<form
								onSubmit={setPasswordForm.handleSubmit(onSetPassword)}
								className="space-y-4"
							>
								<FormField
									control={setPasswordForm.control}
									name="newPassword"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Password</FormLabel>
											<FormControl>
												<div className="relative">
													<Input
														type={showNewPassword ? 'text' : 'password'}
														className="pl-10 pr-10"
														placeholder="Enter password"
														{...field}
													/>
													<Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
													<button
														type="button"
														className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
														onClick={() => setShowNewPassword(!showNewPassword)}
													>
														{showNewPassword ? (
															<EyeOff className="w-5 h-5" />
														) : (
															<Eye className="w-5 h-5" />
														)}
													</button>
												</div>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={setPasswordForm.control}
									name="confirmPassword"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Confirm Password</FormLabel>
											<FormControl>
												<div className="relative">
													<Input
														type={showConfirmPassword ? 'text' : 'password'}
														className="pl-10 pr-10"
														placeholder="Confirm password"
														{...field}
													/>
													<Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
													<button
														type="button"
														className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
														onClick={() => setShowConfirmPassword(!showConfirmPassword)}
													>
														{showConfirmPassword ? (
															<EyeOff className="w-5 h-5" />
														) : (
															<Eye className="w-5 h-5" />
														)}
													</button>
												</div>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<Button type="submit" disabled={isSubmitting}>
									{isSubmitting ? (
										<>
											<Loader2 className="mr-2 h-4 w-4 animate-spin" />
											Setting Password...
										</>
									) : (
										'Set Password'
									)}
								</Button>
							</form>
						</Form>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
