import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID, Matches } from 'class-validator';

export class CreateTenantDto {
	@ApiProperty({ description: "Tenant's full name", example: 'John Doe' })
	@IsString()
	@IsNotEmpty()
	name: string;

	@ApiProperty({ description: "Tenant's email address", example: 'john.doe@example.com' })
	@IsEmail()
	@IsNotEmpty()
	email: string;

	@ApiProperty({ description: "Tenant's phone number (Kenyan format)", example: '0712345678' })
	@IsString()
	@IsNotEmpty()
	@Matches(/^(?:\+254|0)\d{9}$/, { message: 'Invalid Kenyan phone number' })
	phone: string;

	@ApiProperty({ description: 'UUID of the unit to assign', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
	@IsUUID()
	@IsNotEmpty()
	unitId: string;

	@ApiProperty({ description: 'Lease start date (ISO 8601)', example: '2026-02-01T00:00:00.000Z' })
	@IsDateString()
	@IsNotEmpty()
	leaseStart: string;

	@ApiProperty({ description: 'Lease end date (ISO 8601)', example: '2027-01-31T23:59:59.000Z', required: false })
	@IsDateString()
	@IsOptional()
	leaseEnd?: string;
}
