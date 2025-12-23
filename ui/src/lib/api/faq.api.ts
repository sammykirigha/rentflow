import {
	CreateFaqData,
	Faq,
	FaqResponse,
	GetFaqsParams,
	UpdateFaqData,
} from '@/types/faq';
import api from './index';

export const faqApi = {
	/**
	 * Get all FAQs with optional filtering and pagination
	 */
	getAll: async (params?: GetFaqsParams): Promise<Faq[] | FaqResponse> => {
		const response = await api.get<{
			data: Faq[];
			pagination?: {
				page: number;
				limit: number;
				total: number;
				totalPages: number;
			};
		}>('/faqs', {
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
	 * Get active FAQs (for public use)
	 */
	getActive: async (): Promise<Faq[]> => {
		const response = await api.get<{ data: Faq[]; }>('/faqs/active');
		return response.data.data;
	},

	/**
	 * Get FAQ by ID
	 */
	getById: async (id: number): Promise<Faq> => {
		const response = await api.get<{ data: Faq; }>(`/faqs/${id}`);
		return response.data.data;
	},

	/**
	 * Create a new FAQ
	 */
	create: async (data: CreateFaqData): Promise<Faq> => {
		const response = await api.post<{ data: Faq; }>('/faqs', data);
		return response.data.data;
	},

	/**
	 * Update an existing FAQ
	 */
	update: async (id: number, data: UpdateFaqData): Promise<Faq> => {
		const response = await api.patch<{ data: Faq; }>(`/faqs/${id}`, data);
		return response.data.data;
	},

	/**
	 * Delete an FAQ
	 */
	delete: async (id: number): Promise<void> => {
		await api.delete(`/faqs/${id}`);
	},

	/**
	 * Toggle FAQ active status
	 */
	toggleActive: async (id: number): Promise<Faq> => {
		const response = await api.patch<{ data: Faq; }>(`/faqs/${id}/toggle-active`);
		return response.data.data;
	},

	/**
	 * Update FAQ sort order
	 */
	updateSortOrder: async (id: number, sortOrder: number): Promise<Faq> => {
		const response = await api.patch<{ data: Faq; }>(`/faqs/${id}/sort`, {
			sortOrder,
		});
		return response.data.data;
	},

	/**
	 * Bulk toggle active status for multiple FAQs
	 */
	bulkToggleActive: async (faqIds: number[]): Promise<Faq[]> => {
		const response = await api.patch<{ data: Faq[]; }>('/faqs/bulk/toggle-active', {
			faqIds,
		});
		return response.data.data;
	}
};