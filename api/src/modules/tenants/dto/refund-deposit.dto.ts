import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
	IsArray,
	IsNotEmpty,
	IsNumber,
	IsOptional,
	IsString,
	Min,
	ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class DeductionItemDto {
	@ApiProperty({ description: 'Description of the damage/deduction', example: 'Broken window' })
	@IsString()
	@IsNotEmpty()
	description: string;

	@ApiProperty({ description: 'Deduction amount in KES', example: 3000 })
	@IsNumber({ maxDecimalPlaces: 2 })
	@Min(1)
	amount: number;
}

export class RefundDepositDto {
	@ApiProperty({ description: 'Net refund amount to credit to wallet (KES)', example: 12000 })
	@IsNumber({ maxDecimalPlaces: 2 })
	@Min(0)
	amount: number;

	@ApiPropertyOptional({
		description: 'Itemized damage deductions',
		type: [DeductionItemDto],
	})
	@IsOptional()
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => DeductionItemDto)
	deductions?: DeductionItemDto[];
}
