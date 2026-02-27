import { IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdminInitiateStkPushDto {
	@ApiProperty({ description: 'ID of the tenant to send the STK Push to' })
	@IsUUID()
	tenantId: string;

	@ApiProperty({ description: 'Amount in KES to pay', minimum: 1, maximum: 500000 })
	@IsNumber()
	@Min(1)
	@Max(500000)
	amount: number;

	@ApiPropertyOptional({ description: 'Phone number to send STK Push to. Defaults to tenant phone.' })
	@IsString()
	@IsOptional()
	phoneNumber?: string;
}
