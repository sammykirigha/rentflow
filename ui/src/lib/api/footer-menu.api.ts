import {
	CreateFooterColumnData,
	CreateFooterItemData,
	FooterColumn,
	FooterColumnResponse,
	FooterItem,
	FooterItemResponse,
	GetFooterColumnsParams,
	GetFooterItemsParams,
	UpdateFooterColumnData,
	UpdateFooterItemData
} from '@/types/footer-menu';
import api from './index';

export const footerColumnApi = {
	/**
	 * Get all footer columns with optional filtering
	 */
	getAll: async (params?: GetFooterColumnsParams): Promise<FooterColumnResponse> => {
		const response = await api.get<{ data: FooterColumnResponse; }>('/footer-columns', {
			params,
		});
		return response.data?.data;
	},

	/**
	 * Get active footer columns (for public use)
	 */
	getActive: async (): Promise<FooterColumn[]> => {
		const response = await api.get<{ data: FooterColumn[]; }>('/footer-columns/active');
		return response.data?.data;
	},

	/**
	 * Get footer column by ID
	 */
	getById: async (columnId: string): Promise<FooterColumn> => {
		const response = await api.get<{ data: FooterColumn; }>(`/footer-columns/${columnId}`);
		return response.data?.data;
	},

	/**
	 * Create a new footer column
	 */
	create: async (data: CreateFooterColumnData): Promise<FooterColumn> => {
		const response = await api.post<{ data: FooterColumn; }>('/footer-columns', data);
		return response.data?.data;
	},

	/**
	 * Update an existing footer column
	 */
	update: async (columnId: string, data: UpdateFooterColumnData): Promise<FooterColumn> => {
		const response = await api.patch<{ data: FooterColumn; }>(`/footer-columns/${columnId}`, data);
		return response.data?.data;
	},

	/**
	 * Delete a footer column
	 */
	delete: async (columnId: string): Promise<void> => {
		await api.delete(`/footer-columns/${columnId}`);
	},

	/**
	 * Toggle column active status
	 */
	toggleActive: async (columnId: string): Promise<FooterColumn> => {
		const response = await api.patch<{ data: FooterColumn; }>(`/footer-columns/${columnId}/toggle`);
		return response.data?.data;
	},

	/**
	 * Update column sort order
	 */
	updateSortOrder: async (columnId: string, sortOrder: number): Promise<FooterColumn> => {
		const response = await api.patch<{ data: FooterColumn; }>(`/footer-columns/${columnId}/sort`, {
			sortOrder,
		});
		return response.data?.data;
	},
};

export const footerItemApi = {
	/**
	 * Get all footer items with optional filtering
	 */
	getAll: async (params?: GetFooterItemsParams): Promise<FooterItem[] | FooterItemResponse> => {
		const response = await api.get<{ data: FooterItem[] | FooterItemResponse; }>('/footer-items', {
			params,
		});
		return response.data?.data;
	},

	/**
	 * Get footer items by column ID
	 */
	getByColumnId: async (columnId: string): Promise<FooterItem[]> => {
		const response = await api.get<{ data: FooterItem[]; }>(`/footer-items/column/${columnId}`);
		return response.data?.data;
	},

	/**
	 * Get footer item by ID
	 */
	getById: async (itemId: string): Promise<FooterItem> => {
		const response = await api.get<{ data: FooterItem; }>(`/footer-items/${itemId}`);
		return response.data?.data;
	},

	/**
	 * Create a new footer item
	 */
	create: async (data: CreateFooterItemData): Promise<FooterItem> => {
		const response = await api.post<{ data: FooterItem; }>('/footer-items', data);
		return response.data?.data;
	},

	/**
	 * Update an existing footer item
	 */
	update: async (itemId: string, data: UpdateFooterItemData): Promise<FooterItem> => {
		const response = await api.patch<{ data: FooterItem; }>(`/footer-items/${itemId}`, data);
		return response.data?.data;
	},

	/**
	 * Delete a footer item
	 */
	delete: async (itemId: string): Promise<void> => {
		await api.delete(`/footer-items/${itemId}`);
	},

	/**
	 * Toggle item active status
	 */
	toggleActive: async (itemId: string): Promise<FooterItem> => {
		const response = await api.patch<{ data: FooterItem; }>(`/footer-items/${itemId}/toggle`);
		return response.data?.data;
	},

	/**
	 * Update item sort order
	 */
	updateSortOrder: async (itemId: string, sortOrder: number): Promise<FooterItem> => {
		const response = await api.patch<{ data: FooterItem; }>(`/footer-items/${itemId}/sort`, {
			sortOrder,
		});
		return response.data?.data;
	},

	/**
	 * Bulk toggle active status for multiple items
	 */
	bulkToggleActive: async (itemIds: string[]): Promise<FooterItem[]> => {
		const response = await api.patch<{ data: FooterItem[]; }>('/footer-items/bulk/toggle', {
			itemIds,
		});
		return response.data?.data;
	},
};