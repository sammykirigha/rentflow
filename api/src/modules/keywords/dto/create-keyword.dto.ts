import { Type } from 'class-transformer';
import {
	ArrayMinSize,
	IsArray,
	IsBoolean,
	IsNotEmpty,
	IsNumber,
	IsOptional,
	IsString,
	IsUUID,
	Max,
	Min,
	ValidateNested,
} from 'class-validator';

export class KeywordItemDto {
	@IsString()
	@IsNotEmpty()
	keyword: string;

	@IsOptional()
	@IsNumber()
	@Min(0)
	@Max(100)
	difficulty?: number;

	@IsOptional()
	@IsNumber()
	@Min(0)
	volume?: number;

	@IsOptional()
	@IsBoolean()
	isPrimary?: boolean;

	@IsOptional()
	@IsUUID()
	parentKeywordId?: string;
}

export class CreateKeywordsDto {
	@IsArray()
	@ArrayMinSize(1, { message: 'At least one keyword is required' })
	@ValidateNested({ each: true })
	@Type(() => KeywordItemDto)
	keywords: KeywordItemDto[];
}
