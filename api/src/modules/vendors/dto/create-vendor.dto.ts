import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateVendorDto {
	@ApiProperty({ description: 'Vendor name', example: 'John Plumbing Services' })
	@IsString()
	@IsNotEmpty()
	name: string;

	@ApiProperty({ description: 'Vendor phone number (Kenyan format)', example: '0712345678' })
	@IsString()
	@IsNotEmpty()
	phone: string;

	@ApiProperty({ description: 'Vendor email address', required: false, example: 'vendor@example.com' })
	@IsEmail()
	@IsOptional()
	email?: string;

	@ApiProperty({ description: 'Vendor specialty', example: 'Plumbing' })
	@IsString()
	@IsNotEmpty()
	specialty: string;

	@ApiProperty({ description: 'Vendor rating (1.0 to 5.0)', required: false, example: 4.5 })
	@IsNumber()
	@Min(1.0)
	@Max(5.0)
	@IsOptional()
	rating?: number;

	@ApiProperty({ description: 'Whether the vendor is active', required: false, default: true })
	@IsBoolean()
	@IsOptional()
	isActive?: boolean;
}
