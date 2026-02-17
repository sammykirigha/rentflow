import { ApiProperty } from '@nestjs/swagger';
import {
	IsDateString,
	IsEnum,
	IsNumber,
	IsOptional,
	IsString,
	Min,
} from 'class-validator';
import { InvoiceStatus } from '../entities/invoice.entity';

export class UpdateInvoiceDto {
	@ApiProperty({ description: 'Billing month (ISO 8601 date string)', required: false })
	@IsDateString()
	@IsOptional()
	billingMonth?: string;

	@ApiProperty({ description: 'Rent amount in KES', required: false })
	@IsNumber()
	@Min(0)
	@IsOptional()
	rentAmount?: number;

	@ApiProperty({ description: 'Water charge in KES', required: false })
	@IsNumber()
	@Min(0)
	@IsOptional()
	waterCharge?: number;

	@ApiProperty({ description: 'Electricity charge in KES', required: false })
	@IsNumber()
	@Min(0)
	@IsOptional()
	electricityCharge?: number;

	@ApiProperty({ description: 'Other charges in KES', required: false })
	@IsNumber()
	@Min(0)
	@IsOptional()
	otherCharges?: number;

	@ApiProperty({ description: 'Description for other charges', required: false })
	@IsString()
	@IsOptional()
	otherChargesDesc?: string;

	@ApiProperty({ description: 'Due date (ISO 8601 date string)', required: false })
	@IsDateString()
	@IsOptional()
	dueDate?: string;

	@ApiProperty({ description: 'Invoice status', enum: InvoiceStatus, required: false })
	@IsEnum(InvoiceStatus)
	@IsOptional()
	status?: InvoiceStatus;

	@ApiProperty({ description: 'Additional notes', required: false })
	@IsString()
	@IsOptional()
	notes?: string;
}
