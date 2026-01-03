import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class RegenerateTitleDto {
	@ApiPropertyOptional({ description: 'Primary keyword ID' })
	@IsOptional()
	@IsUUID()
	primaryKeywordId?: string;

	@ApiPropertyOptional({ description: 'Additional context for title generation' })
	@IsOptional()
	@IsString()
	context?: string;
}
