import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';
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
}
