import { UserStatus } from '@/common/enums/user-status.enum';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateUserStatusDto {
  @ApiProperty({ 
    enum: UserStatus, 
    description: 'New status for the user' 
  })
  @IsEnum(UserStatus)
  status: UserStatus;

  @ApiProperty({ 
    description: 'Reason for status change (required for suspension)',
    required: false 
  })
  @IsOptional()
  @IsString()
  reason?: string;
}