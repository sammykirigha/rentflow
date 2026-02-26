import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEmail, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min, ValidateNested } from 'class-validator';

export class RecurringChargeDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount: number;

  @IsBoolean()
  enabled: boolean;
}

export class UpdateSystemSettingsDto {
  @ApiPropertyOptional({ description: 'Platform name' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  platformName?: string;

  @ApiPropertyOptional({ description: 'Support email address' })
  @IsOptional()
  @IsEmail()
  supportEmail?: string;

  @ApiPropertyOptional({ description: 'App logo URL', maxLength: 500 })
  @IsOptional()
  @MaxLength(500)
  appLogo?: string;

  @ApiPropertyOptional({ description: 'App favicon URL', maxLength: 500 })
  @IsOptional()
  @MaxLength(500)
  appFavicon?: string;

  @ApiPropertyOptional({ description: 'Contact phone number', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  contactPhone?: string;

  @ApiPropertyOptional({ description: 'Contact address' })
  @IsOptional()
  @IsString()
  contactAddress?: string;

  @ApiPropertyOptional({ description: 'Maximum file upload size in MB', minimum: 1, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  maxFileUploadSize?: number;

  @ApiPropertyOptional({ description: 'Allowed file types for upload', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedFileTypes?: string[];

  @ApiPropertyOptional({ description: 'Allow user signup' })
  @IsOptional()
  @IsBoolean()
  allowSignup?: boolean;

  @ApiPropertyOptional({ description: 'Require email verification for new users' })
  @IsOptional()
  @IsBoolean()
  requireVerification?: boolean;

  @ApiPropertyOptional({ description: 'Enable email notifications' })
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @ApiPropertyOptional({ description: 'Enable SMS notifications' })
  @IsOptional()
  @IsBoolean()
  smsNotifications?: boolean;

  @ApiPropertyOptional({ description: 'Enable admin alerts' })
  @IsOptional()
  @IsBoolean()
  adminAlerts?: boolean;

  @ApiPropertyOptional({ description: 'Recurring charges applied to monthly invoices', type: [RecurringChargeDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecurringChargeDto)
  recurringCharges?: RecurringChargeDto[];
}
