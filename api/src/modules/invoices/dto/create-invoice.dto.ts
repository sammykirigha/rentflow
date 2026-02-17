import { ApiProperty } from '@nestjs/swagger';
import {
	IsDateString,
	IsNotEmpty,
	IsNumber,
	IsOptional,
	IsString,
	IsUUID,
	Min,
} from 'class-validator';

export class CreateInvoiceDto {
	@ApiProperty({ description: 'UUID of the tenant', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
	@IsUUID()
	@IsNotEmpty()
	tenantId: string;

	@ApiProperty({ description: 'Billing month (ISO 8601 date string)', example: '2026-02-01T00:00:00.000Z' })
	@IsDateString()
	@IsNotEmpty()
	billingMonth: string;

	@ApiProperty({ description: 'Rent amount in KES', example: 35000 })
	@IsNumber()
	@Min(0)
	@IsNotEmpty()
	rentAmount: number;

	@ApiProperty({ description: 'Water charge in KES', example: 500, required: false })
	@IsNumber()
	@Min(0)
	@IsOptional()
	waterCharge?: number;

	@ApiProperty({ description: 'Electricity charge in KES', example: 1200, required: false })
	@IsNumber()
	@Min(0)
	@IsOptional()
	electricityCharge?: number;

	@ApiProperty({ description: 'Other charges in KES', example: 300, required: false })
	@IsNumber()
	@Min(0)
	@IsOptional()
	otherCharges?: number;

	@ApiProperty({ description: 'Description for other charges', example: 'Garbage collection', required: false })
	@IsString()
	@IsOptional()
	otherChargesDesc?: string;

	@ApiProperty({ description: 'Due date (ISO 8601 date string)', example: '2026-02-05T00:00:00.000Z' })
	@IsDateString()
	@IsNotEmpty()
	dueDate: string;

	@ApiProperty({ description: 'Additional notes', required: false })
	@IsString()
	@IsOptional()
	notes?: string;
}
