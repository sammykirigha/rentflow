import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class ReconcilePaymentDto {
	@ApiProperty({ description: 'UUID of the tenant to credit this payment to' })
	@IsUUID()
	@IsNotEmpty()
	targetTenantId: string;

	@ApiPropertyOptional({ description: 'Note explaining the reconciliation reason' })
	@IsString()
	@IsOptional()
	note?: string;
}
