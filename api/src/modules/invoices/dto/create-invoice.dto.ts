import { ApiProperty } from '@nestjs/swagger';
import {
	IsDateString,
	IsEnum,
	IsNotEmpty,
	IsNumber,
	IsOptional,
	IsString,
	IsUUID,
	Min,
	ValidateIf,
} from 'class-validator';
import { InvoiceType } from '../entities/invoice.entity';

export class CreateInvoiceDto {
	@ApiProperty({ description: 'Invoice type/purpose', enum: InvoiceType, example: InvoiceType.RENT })
	@IsEnum(InvoiceType)
	@IsNotEmpty()
	invoiceType: InvoiceType;

	@ApiProperty({ description: 'UUID of the tenant', required: false })
	@ValidateIf((o) => o.invoiceType === InvoiceType.RENT || o.tenantId)
	@IsUUID()
	@IsNotEmpty()
	tenantId?: string;

	@ApiProperty({ description: 'Recipient name (required for non-rent invoices without a tenant)', required: false })
	@ValidateIf((o) => o.invoiceType !== InvoiceType.RENT && !o.tenantId)
	@IsString()
	@IsNotEmpty()
	recipientName?: string;

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

	@ApiProperty({ description: 'Additional notes / description (required for "other" type)', required: false })
	@ValidateIf((o) => o.invoiceType === InvoiceType.OTHER)
	@IsString()
	@IsNotEmpty({ message: 'Description is required for "Other" invoice type' })
	notes?: string;
}
