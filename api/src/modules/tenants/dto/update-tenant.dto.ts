import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, Matches } from 'class-validator';
import { TenantStatus } from '../entities/tenant.entity';

export class UpdateTenantDto {
	@ApiProperty({ description: 'Lease end date (ISO 8601)', example: '2027-01-31T23:59:59.000Z', required: false })
	@IsDateString()
	@IsOptional()
	leaseEnd?: string;

	@ApiProperty({ description: 'Tenant status', enum: TenantStatus, required: false })
	@IsEnum(TenantStatus)
	@IsOptional()
	status?: TenantStatus;

	@ApiProperty({ description: 'Unit ID to assign when reactivating a vacated tenant', required: false })
	@IsUUID()
	@IsOptional()
	unitId?: string;

	@ApiProperty({ description: "Tenant's full name", example: 'John Doe', required: false })
	@IsString()
	@IsNotEmpty()
	@IsOptional()
	name?: string;

	@ApiProperty({ description: "Tenant's email address", example: 'john.doe@example.com', required: false })
	@IsEmail()
	@IsOptional()
	email?: string;

	@ApiProperty({ description: "Tenant's phone number (Kenyan format)", example: '0712345678', required: false })
	@IsString()
	@Matches(/^(?:\+254|0)\d{9}$/, { message: 'Invalid Kenyan phone number' })
	@IsOptional()
	phone?: string;

	@ApiProperty({ description: 'National ID / Passport number', example: '12345678', required: false })
	@IsString()
	@IsNotEmpty()
	@IsOptional()
	idNumber?: string;

	@ApiProperty({ description: 'S3 storage key for ID copy document', required: false })
	@IsString()
	@IsOptional()
	idCopyKey?: string;

	@ApiProperty({ description: 'S3 storage key for KRA certificate', required: false })
	@IsString()
	@IsOptional()
	kraCertificateKey?: string;
}
