import { AbstractEntity } from '@/database/abstract.entity';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum AiProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  GOOGLE = 'google',
  CUSTOM = 'custom',
}

@Entity('ai_model_configurations')
export class AiModelConfiguration extends AbstractEntity<AiModelConfiguration> {
  @PrimaryGeneratedColumn('uuid', { name: 'model_id' })
  modelId: string;

  @Column({ type: 'enum', enum: AiProvider })
  provider: AiProvider;

  @Column({ name: 'model_name', type: 'varchar', length: 100 })
  modelName: string;

  @Column({ name: 'display_name', type: 'varchar', length: 100 })
  displayName: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'api_endpoint', type: 'varchar', length: 500, nullable: true })
  apiEndpoint?: string;

  @Column({ name: 'api_key_encrypted', type: 'text', nullable: true })
  apiKeyEncrypted?: string;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'max_tokens', type: 'integer', default: 4000 })
  maxTokens: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0.7 })
  temperature: number;

  @Column({ name: 'top_p', type: 'decimal', precision: 3, scale: 2, default: 1.0 })
  topP: number;

  @Column({ name: 'frequency_penalty', type: 'decimal', precision: 3, scale: 2, default: 0.0 })
  frequencyPenalty: number;

  @Column({ name: 'presence_penalty', type: 'decimal', precision: 3, scale: 2, default: 0.0 })
  presencePenalty: number;

  // Token Pricing Configuration
  @Column({ name: 'input_cost_per_1k_tokens', type: 'decimal', precision: 10, scale: 4, default: 1.0 })
  inputCostPer1kTokens: number;

  @Column({ name: 'output_cost_per_1k_tokens', type: 'decimal', precision: 10, scale: 4, default: 3.0 })
  outputCostPer1kTokens: number;

  @Column({ name: 'minimum_credits', type: 'integer', default: 1 })
  minimumCredits: number;

  @Column({ name: 'model_multiplier', type: 'decimal', precision: 5, scale: 2, default: 1.0 })
  modelMultiplier: number;

  // Connection status columns
  @Column({ name: 'last_connection_at', type: 'timestamp', nullable: true })
  lastConnectionAt?: Date;

  @Column({ name: 'last_connection_successful', type: 'boolean', nullable: true })
  lastConnectionSuccessful?: boolean;

  @Column({ name: 'last_connection_error', type: 'text', nullable: true })
  lastConnectionError?: string;

  // Relations

  // Helper method to get provider display name
  getProviderDisplayName(): string {
    switch (this.provider) {
      case AiProvider.OPENAI:
        return 'OpenAI';
      case AiProvider.ANTHROPIC:
        return 'Anthropic';
      case AiProvider.GOOGLE:
        return 'Google AI';
      case AiProvider.CUSTOM:
        return 'Custom Provider';
      default:
        return this.provider;
    }
  }

  // Helper method to check if API key is configured
  hasApiKey(): boolean {
    return !!this.apiKeyEncrypted;
  }

  // Helper method to get masked API key for display
  getMaskedApiKey(): string {
    if (!this.apiKeyEncrypted) return 'Not configured';
    return '••••••••••••••••';
  }

  // Helper method to get token pricing config
  getTokenPricing(): {
    inputCostPer1kTokens: number;
    outputCostPer1kTokens: number;
    minimumCredits: number;
    modelMultiplier: number;
  } {
    return {
      inputCostPer1kTokens: Number(this.inputCostPer1kTokens),
      outputCostPer1kTokens: Number(this.outputCostPer1kTokens),
      minimumCredits: this.minimumCredits,
      modelMultiplier: Number(this.modelMultiplier),
    };
  }
}