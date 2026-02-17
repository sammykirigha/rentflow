import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class TopupWalletDto {
	@ApiProperty({ description: 'Top-up amount in KES', example: 5000, minimum: 1, maximum: 500000 })
	@IsNumber()
	@Min(1)
	@Max(500000)
	amount: number;

	@ApiPropertyOptional({ description: 'M-Pesa receipt number for reference', example: 'QJK3ABCDEF' })
	@IsOptional()
	@IsString()
	mpesaReceiptNumber?: string;
}
