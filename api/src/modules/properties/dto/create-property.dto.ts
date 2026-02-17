import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUrl, Min } from 'class-validator';

export class CreatePropertyDto {
	@ApiProperty({ description: 'Property name', example: 'Sunrise Apartments' })
	@IsString()
	@IsNotEmpty()
	name: string;

	@ApiProperty({ description: 'Property location', example: 'Westlands, Nairobi' })
	@IsString()
	@IsNotEmpty()
	location: string;

	@ApiProperty({ description: 'Property address', required: false, example: '123 Waiyaki Way' })
	@IsString()
	@IsOptional()
	address?: string;

	@ApiProperty({ description: 'Total number of units', example: 20, minimum: 1 })
	@IsInt()
	@Min(1)
	totalUnits: number;

	@ApiProperty({ description: 'M-Pesa Paybill number', required: false, example: '123456' })
	@IsString()
	@IsOptional()
	paybillNumber?: string;

	@ApiProperty({ description: 'Logo URL', required: false })
	@IsString()
	@IsUrl()
	@IsOptional()
	logoUrl?: string;
}
