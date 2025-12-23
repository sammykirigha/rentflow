export enum AiProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  GOOGLE = 'google',
  CUSTOM = 'custom',
}

export interface AiModelConfiguration {
  modelId: string;
  entityId: string;
  provider: AiProvider;
  modelName: string;
  displayName: string;
  description?: string;
  apiEndpoint?: string;
  isDefault: boolean;
  isActive: boolean;
  maxTokens: number;
  temperature: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  // Token Pricing Configuration
  inputCostPer1kTokens: number;
  outputCostPer1kTokens: number;
  minimumCredits: number;
  modelMultiplier: number;
  // Timestamps
  createdAt: string;
  updatedAt: string;
  lastConnectionAt?: string;
  lastConnectionSuccessful?: boolean;
  lastConnectionError?: string;
}

export interface CreateAiModelDto {
  provider: AiProvider;
  modelName: string;
  displayName: string;
  description?: string;
  apiEndpoint?: string;
  apiKey?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  isDefault?: boolean;
  isActive?: boolean;
  // Token Pricing Configuration
  inputCostPer1kTokens?: number;
  outputCostPer1kTokens?: number;
  minimumCredits?: number;
  modelMultiplier?: number;
}

export interface UpdateAiModelDto extends Partial<CreateAiModelDto> {
  isActive?: boolean;
  isDefault?: boolean;
}

// API Response types
export interface GetAiModelsResponse {
  success: boolean;
  message: string;
  data: AiModelConfiguration[];
}

export interface AiModelResponse {
  success: boolean;
  message: string;
  data: AiModelConfiguration;
}

export interface TestConnectionResponse {
  success: boolean;
  message: string;
}

export interface ApiKeyResponse {
  apiKey: string | null;
}

export interface ToggleStatusResponse {
  success: boolean;
  message: string;
  data: AiModelConfiguration;
}

// Provider display information
export const AI_PROVIDER_INFO = {
  [AiProvider.OPENAI]: {
    name: 'OpenAI',
    description: 'GPT models from OpenAI',
    icon: '🤖',
    color: 'bg-green-100 text-green-800',
    defaultModels: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    requiresEndpoint: false,
  },
  [AiProvider.ANTHROPIC]: {
    name: 'Anthropic',
    description: 'Claude models from Anthropic',
    icon: '🧠',
    color: 'bg-purple-100 text-purple-800',
    defaultModels: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
    requiresEndpoint: false,
  },
  [AiProvider.GOOGLE]: {
    name: 'Google AI',
    description: 'Gemini models from Google',
    icon: '🔍',
    color: 'bg-blue-100 text-blue-800',
    defaultModels: ['gemini-pro', 'gemini-pro-vision'],
    requiresEndpoint: false,
  },
  [AiProvider.CUSTOM]: {
    name: 'Custom Provider',
    description: 'Custom AI model endpoint',
    icon: '⚙️',
    color: 'bg-gray-100 text-gray-800',
    defaultModels: [],
    requiresEndpoint: true,
  },
};

// Form validation schemas
export const AI_MODEL_VALIDATION = {
  displayName: {
    required: true,
    minLength: 1,
    maxLength: 100,
  },
  modelName: {
    required: true,
    minLength: 1,
    maxLength: 100,
  },
  description: {
    required: false,
    maxLength: 500,
  },
  apiEndpoint: {
    required: false,
    maxLength: 500,
    pattern: /^https?:\/\/.+/,
  },
  maxTokens: {
    required: false,
    min: 1,
    max: 32000,
  },
  temperature: {
    required: false,
    min: 0,
    max: 2,
    step: 0.1,
  },
  topP: {
    required: false,
    min: 0,
    max: 1,
    step: 0.1,
  },
  frequencyPenalty: {
    required: false,
    min: -2,
    max: 2,
    step: 0.1,
  },
  presencePenalty: {
    required: false,
    min: -2,
    max: 2,
    step: 0.1,
  },
};

// Default values for new AI models
export const AI_MODEL_DEFAULTS = {
  maxTokens: 4000,
  temperature: 0.7,
  topP: 1.0,
  frequencyPenalty: 0.0,
  presencePenalty: 0.0,
  isActive: true,
  isDefault: false,
};