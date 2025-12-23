import apiClient from '.';

export interface AdminStats {
	totalUsers: number;
	usersChange: number;
	usersChangePercent: string;
	usersTrend: 'up' | 'down';
}


export interface RecentUser {
	id: string;
	name: string;
	email: string;
	subscription: string;
	joinDate: string;
	questionsCount: number;
}

export interface AdminDashboardData {
	stats: AdminStats;
	recentUsers: RecentUser[];
}

export const getAdminDashboardData = async (): Promise<AdminDashboardData> => {
	const response = await apiClient.get<{ data: AdminDashboardData; }>('/admin/stats');
	return response.data.data;
};

export const getAdminStatsOverview = async (): Promise<AdminStats> => {
	const response = await apiClient.get<{ data: AdminStats; }>('/admin/stats/overview');
	return response.data.data;
};


export const getRecentUsers = async (): Promise<RecentUser[]> => {
	const response = await apiClient.get<{ data: RecentUser[]; }>('/admin/stats/recent-users');
	return response.data.data;
};

const adminApi = {
	getAdminDashboardData,
	getAdminStatsOverview,
	getRecentUsers,
};

export default adminApi;
