import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GoogleAuthDto {
  @IsNotEmpty()
  @IsString()
  providerAccountId: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  givenName?: string;

  @IsOptional()
  @IsString()
  familyName?: string;

  @IsOptional()
  @IsString()
  pictureUrl?: string;
}

export class ConnectGoogleDto {
  @IsNotEmpty()
  @IsString()
  providerAccountId: string;

  @IsEmail()
  email: string;
}