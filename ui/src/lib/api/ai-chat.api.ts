import type {
	AdminQuestion,
	AdminQuestionsParams,
	AdminQuestionsResponse,
	ChatMessage,
	Question,
	QuestionStats,
	SendChatMessageRequest
} from '@/types/ai-chat';
import apiClient from '.';

export interface ApiResponse<T> {
	success: boolean;
	message: string;
	data: T;
}

// AI Chat API Functions
export const askQuestion = async (data: FormData): Promise<Question> => {
	const response = await apiClient.post<ApiResponse<Question>>('/ai/ask', data, {
		headers: {
			'Content-Type': 'multipart/form-data',
		},
	});
	return response.data.data;
};

export const getQuestion = async (questionId: string): Promise<Question> => {
	const response = await apiClient.get<ApiResponse<Question>>(`/ai/question/${questionId}`);
	return response.data.data;
};

export const getQuestionWithMessages = async (questionId: string): Promise<Question> => {
	const response = await apiClient.get<ApiResponse<Question>>(`/ai/question/${questionId}/chat`);
	return response.data.data;
};

export const sendChatMessage = async (
	questionId: string,
	data: SendChatMessageRequest,
): Promise<ChatMessage> => {
	const response = await apiClient.post<ApiResponse<ChatMessage>>(
		`/ai/question/${questionId}/chat`,
		data,
	);
	return response.data.data;
};

export const getUserQuestions = async (): Promise<Question[]> => {
	const response = await apiClient.get<ApiResponse<Question[]>>('/ai/questions');
	return response.data.data;
};

export const getChatHistory = async (questionId: string): Promise<ChatMessage[]> => {
	const response = await apiClient.get<ApiResponse<ChatMessage[]>>(`/ai/question/${questionId}/messages`);
	return response.data.data;
};

export const getQuestionStats = async (): Promise<QuestionStats> => {
	const response = await apiClient.get<ApiResponse<QuestionStats>>('/ai/stats');
	return response.data.data;
};

// Admin API Functions
export const getAllQuestions = async (params?: AdminQuestionsParams): Promise<AdminQuestionsResponse> => {
	const searchParams = new URLSearchParams();

	if (params?.page) searchParams.set('page', params.page.toString());
	if (params?.limit) searchParams.set('limit', params.limit.toString());
	if (params?.status) searchParams.set('status', params.status);
	if (params?.userId) searchParams.set('userId', params.userId.toString());
	if (params?.subjectId) searchParams.set('subjectId', params.subjectId.toString());
	if (params?.search) searchParams.set('search', params.search);

	const response = await apiClient.get<{ data: AdminQuestionsResponse; }>(
		`/ai/admin/questions?${searchParams.toString()}`
	);
	return response.data.data;
};

export const getQuestionForAdmin = async (questionId: string): Promise<AdminQuestion> => {
	const response = await apiClient.get<{ data: AdminQuestion; }>(`/ai/admin/question/${questionId}`);
	return response.data?.data;
};

const aiChatApi = {
	askQuestion,
	getQuestion,
	getQuestionWithMessages,
	sendChatMessage,
	getUserQuestions,
	getChatHistory,
	getQuestionStats,
	// Admin functions
	getAllQuestions,
	getQuestionForAdmin,
};

export default aiChatApi;