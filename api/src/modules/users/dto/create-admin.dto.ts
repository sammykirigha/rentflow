import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateAdminDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsOptional()
  firstName?: string;

  @IsOptional()
  lastName?: string;

  @IsString()
  @IsNotEmpty()
  roleId: string;
}