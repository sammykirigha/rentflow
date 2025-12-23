import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateProfileDto {
	@IsOptional()
	@IsString()
	@MinLength(2)
	@MaxLength(50)
	firstName?: string;

	@IsOptional()
	@IsString()
	@MinLength(2)
	@MaxLength(50)
	lastName?: string;

	@IsOptional()
	@IsEmail()
	email?: string;

	@IsOptional()
	@IsString()
	@MaxLength(20)
	phone?: string;
}
