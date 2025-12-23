import type {
	CreateSubscriptionPackageDto,
	PackageStats,
	StripeSettings,
	SubscriptionPackage,
	UpdateStripeSettingsDto,
	UpdateSubscriptionPackageDto,
} from "@/types/stripe";
import api from ".";

// ===============================================
// Stripe Settings API
// ===============================================

export const stripeSettingsApi = {
	// Get Stripe settings
	getSettings: async (): Promise<StripeSettings> => {
		const response = await api.get("/settings/stripe");
		return response.data?.data;
	},

	// Update Stripe settings
	updateSettings: async (
		data: UpdateStripeSettingsDto
	): Promise<StripeSettings> => {
		const response = await api.patch("/settings/stripe", data);
		return response.data?.data;
	},

	// Test Stripe connection
	testConnection: async (): Promise<{ success: boolean; message: string; }> => {
		const response = await api.post("/settings/stripe/test-connection");
		return response.data?.data;
	},

	// Toggle Stripe enabled status
	toggleEnabled: async (): Promise<{
		success: boolean;
		data: StripeSettings;
		message: string;
	}> => {
		const response = await api.post("/settings/stripe/toggle-enabled");
		return response.data?.data;
	},

	// Toggle subscriptions
	toggleSubscriptions: async (): Promise<{
		success: boolean;
		data: StripeSettings;
		message: string;
	}> => {
		const response = await api.post("/settings/stripe/toggle-subscriptions");
		return response.data?.data;
	},

	// Get decrypted secret key (requires special permission)
	getSecretKey: async (): Promise<{ secretKey: string | null; }> => {
		const response = await api.get("/settings/stripe/secret-key");
		return response.data?.data;
	},

	// Get decrypted webhook secret (requires special permission)
	getWebhookSecret: async (): Promise<{ webhookSecret: string | null; }> => {
		const response = await api.get("/settings/stripe/webhook-secret");
		return response.data?.data;
	},
};

// ===============================================
// Subscription Packages API
// ===============================================

export const subscriptionPackagesApi = {
	// Get all visible packages (public)
	getVisiblePackages: async (): Promise<SubscriptionPackage[]> => {
		const response = await api.get("/settings/packages");
		return response.data?.data;
	},

	// Get all packages (admin only)
	getAllPackages: async (): Promise<SubscriptionPackage[]> => {
		const response = await api.get("/settings/packages/all");
		return response.data?.data;
	},

	// Get featured packages
	getFeaturedPackages: async (): Promise<SubscriptionPackage[]> => {
		const response = await api.get("/settings/packages/featured");
		return response.data?.data;
	},

	// Get package statistics
	getStats: async (): Promise<PackageStats> => {
		const response = await api.get("/settings/packages/stats");
		return response.data?.data;
	},

	// Get package by ID
	getById: async (id: number): Promise<SubscriptionPackage> => {
		const response = await api.get(`/settings/packages/${id}`);
		return response.data?.data;
	},

	// Create new package
	create: async (
		data: CreateSubscriptionPackageDto
	): Promise<SubscriptionPackage> => {
		const response = await api.post("/settings/packages", data);
		return response.data?.data;
	},

	// Update package
	update: async (
		id: number,
		data: UpdateSubscriptionPackageDto
	): Promise<SubscriptionPackage> => {
		const response = await api.patch(`/settings/packages/${id}`, data);
		return response.data?.data;
	},

	// Delete package
	delete: async (
		id: number
	): Promise<{ success: boolean; message: string; }> => {
		const response = await api.delete(`/settings/packages/${id}`);
		return response.data?.data;
	},

	// Toggle visibility
	toggleVisibility: async (
		id: number
	): Promise<{
		success: boolean;
		data: SubscriptionPackage;
		message: string;
	}> => {
		const response = await api.post(
			`/settings/packages/${id}/toggle-visibility`
		);
		return response.data?.data;
	},

	// Toggle active status
	toggleActive: async (
		id: number
	): Promise<{
		success: boolean;
		data: SubscriptionPackage;
		message: string;
	}> => {
		const response = await api.post(`/settings/packages/${id}/toggle-active`);
		return response.data?.data;
	},

	// Toggle featured status
	toggleFeatured: async (
		id: number
	): Promise<{
		success: boolean;
		data: SubscriptionPackage;
		message: string;
	}> => {
		const response = await api.post(
			`/settings/packages/${id}/toggle-featured`
		);
		return response.data?.data;
	},
};
