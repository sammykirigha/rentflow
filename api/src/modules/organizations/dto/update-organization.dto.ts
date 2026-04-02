import { IsEmail, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { OrganizationStatus } from '../entities/organization.entity';

export class UpdateOrganizationDto {
	@IsOptional()
	@IsString()
	@MaxLength(100)
	name?: string;

	@IsOptional()
	@IsEnum(OrganizationStatus)
	status?: OrganizationStatus;

	@IsOptional()
	@IsString()
	logoUrl?: string;

	@IsOptional()
	@IsString()
	primaryColor?: string;

	@IsOptional()
	@IsString()
	@MaxLength(200)
	tagline?: string;

	@IsOptional()
	@IsEmail()
	supportEmail?: string;

	@IsOptional()
	@IsString()
	supportPhone?: string;

	// M-Pesa credentials (will be encrypted before storage)
	@IsOptional()
	@IsString()
	mpesaConsumerKey?: string;

	@IsOptional()
	@IsString()
	mpesaConsumerSecret?: string;

	@IsOptional()
	@IsString()
	mpesaPasskey?: string;

	@IsOptional()
	@IsString()
	mpesaShortcode?: string;

	@IsOptional()
	@IsString()
	mpesaEnvironment?: string;

	@IsOptional()
	@IsString()
	mpesaCallbackBaseUrl?: string;

	// SMS credentials
	@IsOptional()
	@IsString()
	atApiKey?: string;

	@IsOptional()
	@IsString()
	atUsername?: string;

	@IsOptional()
	@IsString()
	atSenderId?: string;
}
