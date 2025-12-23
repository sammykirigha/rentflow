import {
	CreateTestimonialData,
	GetTestimonialsParams,
	Testimonial,
	TestimonialResponse,
	UpdateTestimonialData,
} from '@/types/testimonial';
import api from './index';

export const testimonialApi = {
	/**
	 * Get all testimonials with optional filtering
	 */
	getAll: async (params?: GetTestimonialsParams): Promise<Testimonial[] | TestimonialResponse> => {
		const response = await api.get<{ data: Testimonial[] | TestimonialResponse; }>('/testimonials', {
			params,
		});
		return response.data?.data;
	},

	/**
	 * Get active testimonials (for public use)
	 */
	getActive: async (): Promise<Testimonial[]> => {
		const response = await api.get<{ data: Testimonial[]; }>('/testimonials/active');
		return response.data?.data;
	},

	/**
	 * Get featured testimonials (for public use)
	 */
	getFeatured: async (): Promise<Testimonial[]> => {
		const response = await api.get<{ data: Testimonial[]; }>('/testimonials/featured');
		return response.data?.data;
	},

	/**
	 * Get testimonial categories
	 */
	getCategories: async (): Promise<string[]> => {
		const response = await api.get<{ data: string[]; }>('/testimonials/categories');
		return response.data?.data;
	},

	/**
	 * Get testimonial by ID
	 */
	getById: async (testimonialId: string): Promise<Testimonial> => {
		const response = await api.get<{ data: Testimonial; }>(`/testimonials/${testimonialId}`);
		return response.data?.data;
	},

	/**
	 * Create a new testimonial
	 */
	create: async (data: CreateTestimonialData): Promise<Testimonial> => {
		const response = await api.post<{ data: Testimonial; }>('/testimonials', data);
		return response.data?.data;
	},

	/**
	 * Update an existing testimonial
	 */
	update: async (testimonialId: string, data: UpdateTestimonialData): Promise<Testimonial> => {
		const response = await api.patch<{ data: Testimonial; }>(`/testimonials/${testimonialId}`, data);
		return response.data?.data;
	},

	/**
	 * Delete a testimonial
	 */
	delete: async (testimonialId: string): Promise<void> => {
		await api.delete(`/testimonials/${testimonialId}`);
	},

	/**
	 * Toggle testimonial active status
	 */
	toggleActive: async (testimonialId: string): Promise<Testimonial> => {
		const response = await api.patch<{ data: Testimonial; }>(`/testimonials/${testimonialId}/toggle-active`);
		return response.data?.data;
	},

	/**
	 * Toggle testimonial featured status
	 */
	toggleFeatured: async (testimonialId: string): Promise<Testimonial> => {
		const response = await api.patch<{ data: Testimonial; }>(`/testimonials/${testimonialId}/toggle-featured`);
		return response.data?.data;
	},

	/**
	 * Update testimonial sort order
	 */
	updateSortOrder: async (testimonialId: string, sortOrder: number): Promise<Testimonial> => {
		const response = await api.patch<{ data: Testimonial; }>(`/testimonials/${testimonialId}/sort`, {
			sortOrder,
		});
		return response.data?.data;
	},

	/**
	 * Bulk toggle active status for multiple testimonials
	 */
	bulkToggleActive: async (testimonialIds: string[]): Promise<Testimonial[]> => {
		const response = await api.patch<{ data: Testimonial[]; }>('/testimonials/bulk/toggle-active', {
			testimonialIds,
		});
		return response.data?.data;
	},

	/**
	 * Bulk toggle featured status for multiple testimonials
	 */
	bulkToggleFeatured: async (testimonialIds: string[]): Promise<Testimonial[]> => {
		const response = await api.patch<{ data: Testimonial[]; }>('/testimonials/bulk/toggle-featured', {
			testimonialIds,
		});
		return response.data?.data;
	},
};