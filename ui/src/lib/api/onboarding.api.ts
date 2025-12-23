import api from '.';

export interface UserWebsite {
	websiteId: string;
	userId: string;
	websiteUrl: string;
	websiteName?: string;
	websiteDescription?: string;
	scrapedContent?: string;
	scrapedMeta?: {
		title?: string;
		description?: string;
		keywords?: string[];
		favicon?: string;
		ogImage?: string;
		headings?: string[];
		links?: string[];
		internalLinks?: string[];
		externalLinks?: string[];
	};
	scrapingStatus: 'pending' | 'processing' | 'completed' | 'failed';
	scrapingError?: string;
	scrapedAt?: string;
	isPrimary: boolean;
	totalPagesFound: number;
	totalPagesScraped: number;
	createdAt: string;
	updatedAt: string;
}

export interface WebsitePage {
	pageId: string;
	websiteId: string;
	pageUrl: string;
	pagePath: string;
	pageTitle?: string;
	pageDescription?: string;
	scrapedContent?: string;
	scrapedMeta?: {
		title?: string;
		description?: string;
		keywords?: string[];
		ogImage?: string;
		headings?: string[];
		internalLinks?: string[];
		externalLinks?: string[];
	};
	scrapingStatus: 'pending' | 'processing' | 'completed' | 'failed';
	scrapingError?: string;
	scrapedAt?: string;
	depth: number;
	wordCount?: number;
	deletedAt?: string;
	deletedBy?: string;
	createdAt: string;
	updatedAt: string;
}

export interface PageStats {
	total: number;
	completed: number;
	pending: number;
	failed: number;
}

export interface OnboardingStatus {
	isOnboarded: boolean;
	hasWebsite: boolean;
	websiteStatus?: 'pending' | 'processing' | 'completed' | 'failed';
	website?: UserWebsite;
	pageStats?: PageStats;
}

export interface ScrapingStatusResponse {
	website: UserWebsite;
	pageStats: PageStats;
}

export const onboardingApi = {
	// Get onboarding status
	getOnboardingStatus: async (): Promise<OnboardingStatus> => {
		const response = await api.get('/onboarding/status');
		return response.data?.data;
	},

	// Submit website URL (Step 1)
	submitWebsite: async (websiteUrl: string): Promise<UserWebsite> => {
		const response = await api.post('/onboarding/website', { websiteUrl });
		return response.data?.data;
	},

	// Start scraping (Step 2)
	startScraping: async (websiteId: string): Promise<UserWebsite> => {
		const response = await api.post(`/onboarding/website/${websiteId}/scrape`);
		return response.data?.data;
	},

	// Get scraping status with page stats
	getScrapingStatus: async (websiteId: string): Promise<ScrapingStatusResponse> => {
		const response = await api.get(`/onboarding/website/${websiteId}/status`);
		return response.data?.data;
	},

	// Get scraped pages for a website
	getWebsitePages: async (websiteId: string): Promise<WebsitePage[]> => {
		const response = await api.get(`/onboarding/website/${websiteId}/pages`);
		return response.data?.data;
	},

	// Get user's websites
	getUserWebsites: async (): Promise<UserWebsite[]> => {
		const response = await api.get('/onboarding/websites');
		return response.data?.data;
	},

	// Complete onboarding (Step 3)
	completeOnboarding: async (): Promise<{ user: unknown; }> => {
		const response = await api.post('/onboarding/complete');
		return response.data?.data;
	},

	// Get all user's pages (for backlinks)
	getAllUserPages: async (): Promise<WebsitePage[]> => {
		const response = await api.get('/onboarding/pages');
		return response.data?.data;
	},

	// Get a single page by ID
	getPageById: async (pageId: string): Promise<WebsitePage> => {
		const response = await api.get(`/onboarding/pages/${pageId}`);
		return response.data?.data;
	},

	// Refetch/rescrape a single page
	refetchPage: async (pageId: string): Promise<WebsitePage> => {
		const response = await api.post(`/onboarding/pages/${pageId}/refetch`);
		return response.data?.data;
	},

	// Soft delete a page
	deletePage: async (pageId: string): Promise<WebsitePage> => {
		const response = await api.delete(`/onboarding/pages/${pageId}`);
		return response.data?.data;
	},
};
