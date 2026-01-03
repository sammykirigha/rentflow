import api from '.';
import { Keyword } from './keywords.api';

export enum ArticleStatus {
	DRAFT = 'draft',
	GENERATING = 'generating',
	GENERATED = 'generated',
	PUBLISHED = 'published',
	FAILED = 'failed',
}

export interface Article {
	articleId: string;
	userId: string;
	title: string;
	content: string | null;
	contentJson: object | null;
	contentBriefing: string | null;
	referenceContent: string | null;
	primaryKeywordId: string;
	aiModelId: string | null;
	status: ArticleStatus;
	generationError: string | null;
	tokenUsage: {
		inputTokens?: number;
		outputTokens?: number;
		totalTokens?: number;
	} | null;
	wordCount: number;
	generatedAt: string | null;
	createdAt: string;
	updatedAt: string;
	primaryKeyword?: Keyword;
	secondaryKeywords?: Keyword[];
	aiModel?: {
		modelId: string;
		displayName: string;
		provider: string;
	};
}

export interface CreateArticleDto {
	title: string;
	contentBriefing: string;
	referenceContent?: string;
	primaryKeywordId: string;
	secondaryKeywordIds?: string[];
	aiModelId?: string;
}

export interface UpdateArticleDto {
	title?: string;
	content?: string;
	contentJson?: object;
	status?: ArticleStatus;
}

export interface RegenerateTitleDto {
	primaryKeywordId: string;
	context?: string;
}

export interface EditWithAiDto {
	instructions: string;
}

export const articlesApi = {
	// Get all articles for current user
	getArticles: async (): Promise<Article[]> => {
		const response = await api.get('/articles');
		return response.data?.data;
	},

	// Get article by ID
	getArticle: async (articleId: string): Promise<Article> => {
		const response = await api.get(`/articles/${articleId}`);
		return response.data?.data;
	},

	// Get article by primary keyword ID
	getArticleByKeyword: async (keywordId: string): Promise<Article | null> => {
		const response = await api.get(`/articles/by-keyword/${keywordId}`);
		return response.data?.data;
	},

	// Create new article
	createArticle: async (data: CreateArticleDto): Promise<Article> => {
		const response = await api.post('/articles', data);
		return response.data?.data;
	},

	// Regenerate title
	regenerateTitle: async (data: RegenerateTitleDto): Promise<{ title: string; }> => {
		const response = await api.post('/articles/regenerate-title', data);
		return response.data?.data;
	},

	// Update article
	updateArticle: async (articleId: string, data: UpdateArticleDto): Promise<Article> => {
		const response = await api.patch(`/articles/${articleId}`, data);
		return response.data?.data;
	},

	// Delete article
	deleteArticle: async (articleId: string): Promise<void> => {
		await api.delete(`/articles/${articleId}`);
	},

	// Edit article with AI
	editWithAi: async (articleId: string, data: EditWithAiDto): Promise<Article> => {
		const response = await api.post(`/articles/${articleId}/edit-with-ai`, data);
		return response.data?.data;
	},
};
