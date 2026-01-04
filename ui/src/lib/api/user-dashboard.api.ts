import apiClient from '.';

export interface UserStats {
	totalKeywords: number;
	primaryKeywords: number;
	secondaryKeywords: number;
	totalArticles: number;
	draftArticles: number;
	generatedArticles: number;
	publishedArticles: number;
}

export interface RecentArticle {
	articleId: string;
	title: string;
	status: string;
	wordCount: number;
	createdAt: string;
	primaryKeyword?: {
		keyword: string;
	};
}

export interface RecentKeyword {
	keywordId: string;
	keyword: string;
	difficulty: number;
	volume: number;
	isPrimary: boolean;
	isAnalyzed: boolean;
	createdAt: string;
}

export interface UserDashboardData {
	stats: UserStats;
	recentArticles: RecentArticle[];
	recentKeywords: RecentKeyword[];
}

export const getUserDashboardData = async (): Promise<UserDashboardData> => {
	const response = await apiClient.get<{ data: UserDashboardData; }>('/users/dashboard');
	return response.data.data;
};

const userDashboardApi = {
	getUserDashboardData,
};

export default userDashboardApi;
