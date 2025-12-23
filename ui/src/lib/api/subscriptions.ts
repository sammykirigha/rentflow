import type {
	CancelSubscriptionDto,
	CanPerformActionResponse,
	CheckoutSessionResponse,
	CreateCheckoutSessionDto,
	SubscriptionPackage,
	UpdateSubscriptionDto,
	UsageStatistics,
	UserSubscription,
} from '@/types/subscription';
import apiClient from './';

const SUBSCRIPTIONS_BASE = '/subscriptions';

export const subscriptionsApi = {
	/**
	 * Get current user's subscription
	 */
	getCurrentSubscription: async (): Promise<UserSubscription | null> => {
		const response = await apiClient.get(`${SUBSCRIPTIONS_BASE}/current`);
		return response.data?.data;
	},

	/**
	 * Get active subscription
	 */
	getActiveSubscription: async (): Promise<UserSubscription | null> => {
		const response = await apiClient.get(`${SUBSCRIPTIONS_BASE}/active`);
		return response.data?.data;
	},

	/**
	 * Get usage statistics
	 */
	getUsageStatistics: async (): Promise<UsageStatistics> => {
		const response = await apiClient.get(`${SUBSCRIPTIONS_BASE}/usage`);
		return response.data?.data;
	},

	/**
	 * Create checkout session
	 */
	createCheckoutSession: async (data: CreateCheckoutSessionDto): Promise<CheckoutSessionResponse> => {
		const response = await apiClient.post(`${SUBSCRIPTIONS_BASE}/checkout`, data);
		return response.data?.data;
	},

	/**
	 * Cancel subscription
	 */
	cancelSubscription: async (data: CancelSubscriptionDto): Promise<UserSubscription> => {
		const response = await apiClient.post(`${SUBSCRIPTIONS_BASE}/cancel`, data);
		return response.data?.data;
	},

	/**
	 * Reactivate subscription
	 */
	reactivateSubscription: async (): Promise<UserSubscription> => {
		const response = await apiClient.post(`${SUBSCRIPTIONS_BASE}/reactivate`);
		return response.data?.data;
	},

	/**
	 * Update subscription (upgrade/downgrade)
	 */
	updateSubscription: async (data: UpdateSubscriptionDto): Promise<{ message: string; newPackage: SubscriptionPackage; }> => {
		const response = await apiClient.post(`${SUBSCRIPTIONS_BASE}/update`, data);
		return response.data?.data;
	},

	/**
	 * Get billing portal URL
	 */
	getBillingPortal: async (): Promise<{ url: string; }> => {
		const response = await apiClient.get(`${SUBSCRIPTIONS_BASE}/billing-portal`);
		return response.data?.data;
	},

	/**
	 * Check if user can perform action
	 */
	canPerformAction: async (action: 'question' | 'chat' | 'upload'): Promise<CanPerformActionResponse> => {
		const response = await apiClient.get(`${SUBSCRIPTIONS_BASE}/can/${action}`);
		return response.data?.data;
	},
};

export const packagesApi = {
	/**
	 * Get all visible packages (public)
	 */
	getVisiblePackages: async (): Promise<SubscriptionPackage[]> => {
		const response = await apiClient.get('/settings/packages');
		return response.data?.data;
	},

	/**
	 * Get featured packages
	 */
	getFeaturedPackages: async (): Promise<SubscriptionPackage[]> => {
		const response = await apiClient.get('/settings/packages/featured');
		return response.data?.data;
	},

	/**
	 * Get package by ID
	 */
	getPackageById: async (id: number): Promise<SubscriptionPackage> => {
		const response = await apiClient.get(`/settings/packages/${id}`);
		return response.data?.data;
	},
};
