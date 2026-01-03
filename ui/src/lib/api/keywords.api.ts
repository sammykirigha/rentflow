import api from '.';

export interface Keyword {
	keywordId: string;
	userId: string;
	keyword: string;
	difficulty: number;
	volume: number;
	recommendedTitle: string | null;
	aiAnalysis: {
		difficultyScore?: number;
		volumeEstimate?: number;
		trend?: string;
	} | null;
	isAnalyzed: boolean;
	isPrimary: boolean;
	parentKeywordId: string | null;
	parentKeyword?: Keyword | null;
	secondaryKeywords?: Keyword[];
	createdAt: string;
	updatedAt: string;
}

export interface KeywordItem {
	keyword: string;
	difficulty?: number;
	volume?: number;
	isPrimary?: boolean;
	parentKeywordId?: string;
}

export interface CreateKeywordsDto {
	keywords: KeywordItem[];
}

export const keywordsApi = {
	// Get all keywords for the current user
	getKeywords: async (): Promise<Keyword[]> => {
		const response = await api.get('/keywords');
		return response.data?.data;
	},

	// Create new keywords
	createKeywords: async (data: CreateKeywordsDto): Promise<Keyword[]> => {
		const response = await api.post('/keywords', data);
		return response.data?.data;
	},

	// Get a single keyword
	getKeyword: async (keywordId: string): Promise<Keyword> => {
		const response = await api.get(`/keywords/${keywordId}`);
		return response.data?.data;
	},

	// Reanalyze a keyword
	reanalyzeKeyword: async (keywordId: string): Promise<Keyword> => {
		const response = await api.put(`/keywords/${keywordId}/reanalyze`);
		return response.data?.data;
	},

	// Delete a keyword
	deleteKeyword: async (keywordId: string): Promise<void> => {
		await api.delete(`/keywords/${keywordId}`);
	},

	// Delete multiple keywords
	deleteMultipleKeywords: async (keywordIds: string[]): Promise<void> => {
		await api.post('/keywords/delete-multiple', { keywordIds });
	},

	// Update keyword primary status
	updatePrimaryStatus: async (keywordId: string, isPrimary: boolean): Promise<Keyword> => {
		const response = await api.put(`/keywords/${keywordId}/primary`, { isPrimary });
		return response.data?.data;
	},

	// Update parent keyword for a secondary keyword
	updateParentKeyword: async (keywordId: string, parentKeywordId: string | null): Promise<Keyword> => {
		const response = await api.put(`/keywords/${keywordId}/parent`, { parentKeywordId });
		return response.data?.data;
	},

	// Get all primary keywords (for dropdown selection)
	getPrimaryKeywords: async (): Promise<Keyword[]> => {
		const response = await api.get('/keywords/primary/list');
		return response.data?.data;
	},

	// Bulk update primary status for multiple keywords
	bulkUpdatePrimaryStatus: async (keywordIds: string[], isPrimary: boolean): Promise<Keyword[]> => {
		const response = await api.post('/keywords/bulk-primary', { keywordIds, isPrimary });
		return response.data?.data;
	},

	// Bulk update parent keyword for multiple secondary keywords
	bulkUpdateParentKeyword: async (keywordIds: string[], parentKeywordId: string | null): Promise<Keyword[]> => {
		const response = await api.post('/keywords/bulk-parent', { keywordIds, parentKeywordId });
		return response.data?.data;
	},
};
