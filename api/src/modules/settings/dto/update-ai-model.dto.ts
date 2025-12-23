import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsBoolean } from 'class-validator';
import { CreateAiModelDto } from './create-ai-model.dto';

export class UpdateAiModelDto extends PartialType(CreateAiModelDto) {
  @ApiPropertyOptional({ description: 'Whether the model is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Whether this should be the default model' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}