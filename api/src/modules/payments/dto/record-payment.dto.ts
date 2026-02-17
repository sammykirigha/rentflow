import { ApiProperty } from '@nestjs/swagger';
import {
	IsEnum,
	IsNotEmpty,
	IsNumber,
	IsOptional,
	IsString,
	IsUUID,
	Min,
} from 'class-validator';
import { PaymentMethod } from '../entities/payment.entity';

export class RecordPaymentDto {
	@ApiProperty({ description: 'UUID of the tenant', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
	@IsUUID()
	@IsNotEmpty()
	tenantId: string;

	@ApiProperty({ description: 'UUID of the invoice (optional)', required: false })
	@IsUUID()
	@IsOptional()
	invoiceId?: string;

	@ApiProperty({ description: 'Payment amount in KES', example: 35000 })
	@IsNumber()
	@Min(0.01)
	@IsNotEmpty()
	amount: number;

	@ApiProperty({ description: 'Payment method', enum: PaymentMethod, example: PaymentMethod.MPESA_PAYBILL })
	@IsEnum(PaymentMethod)
	@IsNotEmpty()
	method: PaymentMethod;

	@ApiProperty({ description: 'M-Pesa receipt number', required: false, example: 'QJI3VGHE4F' })
	@IsString()
	@IsOptional()
	mpesaReceiptNumber?: string;

	@ApiProperty({ description: 'M-Pesa phone number', required: false, example: '254712345678' })
	@IsString()
	@IsOptional()
	mpesaPhoneNumber?: string;

	@ApiProperty({ description: 'Additional notes', required: false })
	@IsString()
	@IsOptional()
	notes?: string;
}
