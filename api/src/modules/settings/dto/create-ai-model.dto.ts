import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, IsUrl, Max, MaxLength, Min } from 'class-validator';
import { AiProvider } from '../entities/ai-model-configuration.entity';

export class CreateAiModelDto {
  @ApiProperty({ enum: AiProvider, description: 'AI provider type' })
  @IsEnum(AiProvider)
  provider: AiProvider;

  @ApiProperty({ description: 'Model name (e.g., gpt-4, claude-3-opus)', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  modelName: string;

  @ApiProperty({ description: 'Display name for the model', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  displayName: string;

  @ApiPropertyOptional({ description: 'Model description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Custom API endpoint (for custom providers)', maxLength: 500 })
  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  apiEndpoint?: string;

  @ApiPropertyOptional({ description: 'API key for the model' })
  @IsOptional()
  @IsString()
  apiKey?: string;

  @ApiPropertyOptional({ description: 'Maximum tokens', minimum: 1, maximum: 32000, default: 4000 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(32000)
  @Type(() => Number)
  maxTokens?: number = 4000;

  @ApiPropertyOptional({ description: 'Temperature setting', minimum: 0, maximum: 2, default: 0.7 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  @Type(() => Number)
  temperature?: number = 0.7;

  @ApiPropertyOptional({ description: 'Top P setting', minimum: 0, maximum: 1, default: 1.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  @Type(() => Number)
  topP?: number = 1.0;

  @ApiPropertyOptional({ description: 'Frequency penalty', minimum: -2, maximum: 2, default: 0.0 })
  @IsOptional()
  @IsNumber()
  @Min(-2)
  @Max(2)
  @Type(() => Number)
  frequencyPenalty?: number = 0.0;

  @ApiPropertyOptional({ description: 'Presence penalty', minimum: -2, maximum: 2, default: 0.0 })
  @IsOptional()
  @IsNumber()
  @Min(-2)
  @Max(2)
  @Type(() => Number)
  presencePenalty?: number = 0.0;

  @ApiPropertyOptional({ description: 'Whether this should be the default model', default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean = false;

  // Token Pricing Configuration
  @ApiPropertyOptional({ description: 'Cost in credits per 1000 input tokens', minimum: 0, default: 1.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  inputCostPer1kTokens?: number = 1.0;

  @ApiPropertyOptional({ description: 'Cost in credits per 1000 output tokens', minimum: 0, default: 3.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  outputCostPer1kTokens?: number = 3.0;

  @ApiPropertyOptional({ description: 'Minimum credits charged per request', minimum: 0, default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minimumCredits?: number = 1;

  @ApiPropertyOptional({ description: 'Multiplier for premium model pricing', minimum: 0.1, maximum: 10, default: 1.0 })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(10)
  @Type(() => Number)
  modelMultiplier?: number = 1.0;

  @ApiPropertyOptional({ description: 'Whether the model is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}