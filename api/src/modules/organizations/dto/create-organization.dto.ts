import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateOrganizationDto {
	@IsNotEmpty()
	@IsString()
	@MaxLength(100)
	name: string;

	@IsNotEmpty()
	@IsString()
	@Matches(/^[a-z0-9-]+$/, { message: 'Slug must be lowercase alphanumeric with hyphens' })
	@MaxLength(50)
	slug: string;

	@IsOptional()
	@IsString()
	logoUrl?: string;

	@IsOptional()
	@IsString()
	primaryColor?: string;

	@IsOptional()
	@IsEmail()
	supportEmail?: string;

	@IsOptional()
	@IsString()
	supportPhone?: string;
}
