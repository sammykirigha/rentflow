import {
	CreatePromoBannerData,
	GetPromoBannersParams,
	PromoBanner,
	PromoBannerResponse,
	UpdatePromoBannerData,
} from '@/types/promo-banner';
import api from './index';

export const promoBannerApi = {
	/**
	 * Get all promo banners with optional filtering and pagination
	 */
	getAll: async (params?: GetPromoBannersParams): Promise<PromoBanner[] | PromoBannerResponse> => {
		const response = await api.get<{
			data: PromoBanner[];
			pagination?: {
				page: number;
				limit: number;
				total: number;
				totalPages: number;
			};
		}>('/promo-banners', {
			params,
		});

		if (response.data.pagination) {
			return {
				data: response.data.data,
				pagination: response.data.pagination,
			};
		}

		return response.data.data;
	},

	/**
	 * Get active promo banners (for public use)
	 */
	getActive: async (placement?: string): Promise<PromoBanner[]> => {
		const response = await api.get<{ data: PromoBanner[]; }>('/promo-banners/active', {
			params: placement ? { placement } : undefined,
		});
		return response.data.data;
	},

	/**
	 * Get promo banner by ID
	 */
	getById: async (id: number): Promise<PromoBanner> => {
		const response = await api.get<{ data: PromoBanner; }>(`/promo-banners/${id}`);
		return response.data.data;
	},

	/**
	 * Create new promo banner
	 */
	create: async (data: CreatePromoBannerData): Promise<PromoBanner> => {
		const response = await api.post<{ data: PromoBanner; }>('/promo-banners', data);
		return response.data.data;
	},

	/**
	 * Update promo banner
	 */
	update: async (id: number, data: UpdatePromoBannerData): Promise<PromoBanner> => {
		const response = await api.patch<{ data: PromoBanner; }>(`/promo-banners/${id}`, data);
		return response.data.data;
	},

	/**
	 * Delete promo banner
	 */
	delete: async (id: number): Promise<void> => {
		await api.delete(`/promo-banners/${id}`);
	},

	/**
	 * Toggle active status
	 */
	toggleActive: async (id: number): Promise<PromoBanner> => {
		const response = await api.patch<{ data: PromoBanner; }>(`/promo-banners/${id}/toggle-active`);
		return response.data.data;
	},

	/**
	 * Update sort order
	 */
	updateSortOrder: async (items: { id: number; sortOrder: number; }[]): Promise<void> => {
		await api.patch('/promo-banners/sort-order/update', items);
	},
};

export default promoBannerApi;
