import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { AiModelConfigurationService } from '../settings/ai-model-configuration.service';

export interface TokenUsageDetails {
	inputTokens: number;
	outputTokens: number;
	totalTokens: number;
}

export interface AiResponse {
	content: string;
	tokenUsage: TokenUsageDetails;
	modelName: string;
}

@Injectable()
export class OpenAiService {
	private readonly logger = new Logger(OpenAiService.name);

	constructor(
		private readonly modelService: AiModelConfigurationService,
	) { }

	async getInstance(apiKey: string) {
		const openai = new OpenAI({
			apiKey: apiKey,
		});
		return openai;
	}

	async testApiKey(apiKey: string): Promise<boolean> {
		try {
			const openai = await this.getInstance(apiKey);
			// Make a simple request to verify the API key
			await openai.models.list();
			return true;
		} catch (error) {
			this.logger.error('Failed to validate OpenAI API key', error);
			return false;
		}
	}

	async chat(input: OpenAI.Responses.ResponseInput): Promise<AiResponse> {
		const model = await this.modelService.getDefaultModel();
		if (!model) {
			this.logger.error('Failed to find default AI model configuration');
			throw new Error('Failed to find default AI model configuration');
		}
		const apiKey = await this.modelService.getDecryptedApiKey(model.modelId);
		if (!apiKey) {
			this.logger.error('Failed to decrypt API key for default AI model');
			throw new Error('Failed to decrypt API key for default AI model');
		}

		const client = await this.getInstance(apiKey);

		const response = await client.responses.create({
			model: model.modelName,
			input,
		});

		// Extract detailed token usage from OpenAI response
		const usage = response.usage;
		const tokenUsage: TokenUsageDetails = {
			inputTokens: usage?.input_tokens || 0,
			outputTokens: usage?.output_tokens || 0,
			totalTokens: usage?.total_tokens || 0,
		};

		return {
			content: response.output_text,
			tokenUsage,
			modelName: model.modelName,
		};
	}
}