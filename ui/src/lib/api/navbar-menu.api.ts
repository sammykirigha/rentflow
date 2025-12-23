import {
	CreateNavbarMenuRequest,
	GetNavbarMenusRequest,
	NavbarMenu,
	NavbarMenusResponse,
	ReorderMenusRequest,
	UpdateNavbarMenuRequest,
} from '@/types/navbar-menu';
import api from './index';

export const navbarMenuApi = {
	/**
	 * Get all navbar menus with optional filtering
	 */
	getAll: async (params?: GetNavbarMenusRequest): Promise<NavbarMenu[] | NavbarMenusResponse> => {
		const response = await api.get<{ data: NavbarMenu[] | NavbarMenusResponse; }>('/navbar-menus', {
			params,
		});
		return response.data?.data;
	},

	/**
	 * Get navbar menus in hierarchical structure
	 */
	getHierarchical: async (activeOnly: boolean = true): Promise<NavbarMenu[]> => {
		const response = await api.get<{ data: NavbarMenu[]; }>('/navbar-menus/hierarchical', {
			params: { activeOnly },
		});
		return response.data?.data;
	},

	/**
	 * Get navbar menu by ID
	 */
	getById: async (id: string): Promise<NavbarMenu> => {
		const response = await api.get<{ data: NavbarMenu; }>(`/navbar-menus/${id}`);
		return response.data?.data;
	},

	/**
	 * Get navbar menu by slug
	 */
	getBySlug: async (slug: string): Promise<NavbarMenu> => {
		const response = await api.get<{ data: NavbarMenu; }>(`/navbar-menus/slug/${slug}`);
		return response.data?.data;
	},

	/**
	 * Create a new navbar menu
	 */
	create: async (data: CreateNavbarMenuRequest): Promise<NavbarMenu> => {
		const response = await api.post<{ data: NavbarMenu; }>('/navbar-menus', data);
		return response.data?.data;
	},

	/**
	 * Update an existing navbar menu
	 */
	update: async (id: string, data: UpdateNavbarMenuRequest): Promise<NavbarMenu> => {
		const response = await api.patch<{ data: NavbarMenu; }>(`/navbar-menus/${id}`, data);
		return response.data?.data;
	},

	/**
	 * Delete a navbar menu
	 */
	delete: async (id: string): Promise<void> => {
		await api.delete(`/navbar-menus/${id}`);
	},

	/**
	 * Update menu sort order
	 */
	updateSortOrder: async (id: string, sortOrder: number): Promise<NavbarMenu> => {
		const response = await api.patch<{ data: NavbarMenu; }>(`/navbar-menus/${id}/sort-order`, {
			sortOrder,
		});
		return response.data?.data;
	},

	/**
	 * Reorder multiple menus
	 */
	reorder: async (data: ReorderMenusRequest): Promise<NavbarMenu[]> => {
		const response = await api.post<{ data: NavbarMenu[]; }>('/navbar-menus/reorder', data);
		return response.data?.data;
	},

	/**
	 * Toggle menu active status
	 */
	toggleActive: async (id: string): Promise<NavbarMenu> => {
		const response = await api.patch<{ data: NavbarMenu; }>(`/navbar-menus/${id}/toggle-active`);
		return response.data?.data;
	},
};