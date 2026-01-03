import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateArticleDto {
	@ApiProperty({ description: 'Article title' })
	@IsNotEmpty()
	@IsString()
	@MaxLength(500)
	title: string;

	@ApiProperty({ description: 'Content briefing/instructions for article generation' })
	@IsNotEmpty()
	@IsString()
	contentBriefing: string;

	@ApiPropertyOptional({ description: 'Reference content to be used for article generation' })
	@IsOptional()
	@IsString()
	referenceContent?: string;

	@ApiProperty({ description: 'Primary keyword ID' })
	@IsNotEmpty()
	@IsUUID()
	primaryKeywordId: string;

	@ApiPropertyOptional({ description: 'Secondary keyword IDs', type: [String] })
	@IsOptional()
	@IsArray()
	@IsUUID('4', { each: true })
	secondaryKeywordIds?: string[];

	@ApiPropertyOptional({ description: 'AI model ID to use for generation' })
	@IsOptional()
	@IsUUID()
	aiModelId?: string;
}
