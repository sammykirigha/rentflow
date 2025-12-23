import type {
  AiModelConfiguration,
  ApiKeyResponse,
  CreateAiModelDto,
  TestConnectionResponse,
  ToggleStatusResponse,
  UpdateAiModelDto
} from '@/types/ai-models';
import apiClient from '.';

// AI Models API
export const getAllAiModels = async (): Promise<AiModelConfiguration[]> => {
  const response = await apiClient.get<{ data: AiModelConfiguration[]; }>('/settings/ai-models');
  return response.data?.data;
};

export const getActiveAiModels = async (): Promise<AiModelConfiguration[]> => {
  const response = await apiClient.get<{ data: AiModelConfiguration[]; }>('/settings/ai-models/active');
  return response.data?.data;
};

export const getDefaultAiModel = async (): Promise<AiModelConfiguration | null> => {
  try {
    const response = await apiClient.get<{ data: AiModelConfiguration; }>('/settings/ai-models/default');
    return response.data?.data || null;
  } catch (error) {
    // Return null if no default model is set
    return null;
  }
};

export const getAiModelById = async (id: number): Promise<AiModelConfiguration> => {
  const response = await apiClient.get<{ data: AiModelConfiguration; }>(`/settings/ai-models/${id}`);
  return response.data?.data;
};

export const createAiModel = async (data: CreateAiModelDto): Promise<AiModelConfiguration> => {
  const response = await apiClient.post<{ data: AiModelConfiguration; }>('/settings/ai-models', data);
  return response.data?.data;
};

export const updateAiModel = async (id: number, data: UpdateAiModelDto): Promise<AiModelConfiguration> => {
  const response = await apiClient.patch<{ data: AiModelConfiguration; }>(`/settings/ai-models/${id}`, data);
  return response.data?.data;
};

export const deleteAiModel = async (id: number): Promise<void> => {
  await apiClient.delete(`/settings/ai-models/${id}`);
};

export const setDefaultAiModel = async (id: number): Promise<void> => {
  await apiClient.post(`/settings/ai-models/${id}/set-default`);
};

export const toggleAiModelStatus = async (id: number): Promise<AiModelConfiguration> => {
  const response = await apiClient.post<ToggleStatusResponse>(`/settings/ai-models/${id}/toggle-status`);
  return response.data.data;
};

export const testAiModelConnection = async (id: number): Promise<boolean> => {
  const response = await apiClient.post<{ data: TestConnectionResponse; }>(`/settings/ai-models/${id}/test-connection`);
  return response.data?.data?.success;
};

export const getAiModelApiKey = async (id: number): Promise<string | null> => {
  const response = await apiClient.get<{ data: ApiKeyResponse; }>(`/settings/ai-models/${id}/api-key`);
  return response.data?.data?.apiKey;
};

const aiModelsApi = {
  getAllAiModels,
  getActiveAiModels,
  getDefaultAiModel,
  getAiModelById,
  createAiModel,
  updateAiModel,
  deleteAiModel,
  setDefaultAiModel,
  toggleAiModelStatus,
  testAiModelConnection,
  getAiModelApiKey,
};

export default aiModelsApi;