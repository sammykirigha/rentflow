import { DataSource } from 'typeorm';
import { AiModelConfiguration, AiProvider } from '@/modules/settings/entities/ai-model-configuration.entity';
import { EncryptionService } from '@/common/services/encryption.service';

export default class AiModelsSeed {
  public async run(dataSource: DataSource): Promise<void> {
    const aiModelRepository = dataSource.getRepository(AiModelConfiguration);
    const encryptionService = new EncryptionService({
      get: (key: string) => process.env[key]
    } as any);

    // Check if AI models already exist
    const existingModels = await aiModelRepository.count();
    if (existingModels > 0) {
      console.log('AI models already exist, skipping seed...');
      return;
    }

    console.log('Seeding default AI models...');

    const defaultModels = [
      {
        provider: AiProvider.OPENAI,
        modelName: 'gpt-4',
        displayName: 'GPT-4',
        description: 'Most capable GPT model, great for complex reasoning and analysis',
        maxTokens: 4000,
        temperature: 0.7,
        topP: 1.0,
        frequencyPenalty: 0.0,
        presencePenalty: 0.0,
        isDefault: true,
        isActive: true,
      },
      {
        provider: AiProvider.OPENAI,
        modelName: 'gpt-4-turbo',
        displayName: 'GPT-4 Turbo',
        description: 'Faster and more cost-effective version of GPT-4',
        maxTokens: 4000,
        temperature: 0.7,
        topP: 1.0,
        frequencyPenalty: 0.0,
        presencePenalty: 0.0,
        isDefault: false,
        isActive: true,
      },
      {
        provider: AiProvider.OPENAI,
        modelName: 'gpt-3.5-turbo',
        displayName: 'GPT-3.5 Turbo',
        description: 'Fast and efficient model for most educational tasks',
        maxTokens: 4000,
        temperature: 0.7,
        topP: 1.0,
        frequencyPenalty: 0.0,
        presencePenalty: 0.0,
        isDefault: false,
        isActive: true,
      },
      {
        provider: AiProvider.ANTHROPIC,
        modelName: 'claude-3-opus',
        displayName: 'Claude 3 Opus',
        description: 'Most powerful Claude model for complex reasoning',
        maxTokens: 4000,
        temperature: 0.7,
        topP: 1.0,
        frequencyPenalty: 0.0,
        presencePenalty: 0.0,
        isDefault: false,
        isActive: false, // Inactive by default until API key is configured
      },
      {
        provider: AiProvider.ANTHROPIC,
        modelName: 'claude-3-sonnet',
        displayName: 'Claude 3 Sonnet',
        description: 'Balanced Claude model for general educational assistance',
        maxTokens: 4000,
        temperature: 0.7,
        topP: 1.0,
        frequencyPenalty: 0.0,
        presencePenalty: 0.0,
        isDefault: false,
        isActive: false,
      },
      {
        provider: AiProvider.GOOGLE,
        modelName: 'gemini-pro',
        displayName: 'Gemini Pro',
        description: 'Google\'s advanced AI model for educational content',
        maxTokens: 4000,
        temperature: 0.7,
        topP: 1.0,
        frequencyPenalty: 0.0,
        presencePenalty: 0.0,
        isDefault: false,
        isActive: false,
      },
    ];

    for (const modelData of defaultModels) {
      try {
        // Create model without API key (will be configured later by admin)
        const model = aiModelRepository.create({
          ...modelData,
          apiKeyEncrypted: null,
        });

        await aiModelRepository.save(model);
        console.log(`✓ Created AI model: ${modelData.displayName}`);
      } catch (error) {
        console.error(`✗ Failed to create AI model ${modelData.displayName}:`, error);
      }
    }

    console.log('AI models seeding completed!');
  }
}