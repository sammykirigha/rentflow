import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ArticleStatus } from '../entities/article.entity';

export class UpdateArticleDto {
	@ApiPropertyOptional({ description: 'Article title' })
	@IsOptional()
	@IsString()
	@MaxLength(500)
	title?: string;

	@ApiPropertyOptional({ description: 'Article content (HTML)' })
	@IsOptional()
	@IsString()
	content?: string;

	@ApiPropertyOptional({ description: 'Article content as JSON (TipTap format)' })
	@IsOptional()
	contentJson?: object;

	@ApiPropertyOptional({ description: 'Article status', enum: ArticleStatus })
	@IsOptional()
	@IsEnum(ArticleStatus)
	status?: ArticleStatus;
}
