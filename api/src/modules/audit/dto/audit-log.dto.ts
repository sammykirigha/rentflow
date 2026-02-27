import { AuditAction } from '@/common/enums/audit-action.enum';
import { AuditTargetType } from '@/common/enums/audit-target-type.enum';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateAuditLogDto {
	@ApiProperty({ enum: AuditAction })
	@IsEnum(AuditAction)
	@IsNotEmpty()
	action: AuditAction;

	@ApiProperty({ required: false })
	@IsString()
	@IsOptional()
	performedBy?: string;

	@ApiProperty({ required: false })
	@IsString()
	@IsOptional()
	performerName?: string;

	@ApiProperty({ enum: AuditTargetType })
	@IsEnum(AuditTargetType)
	@IsNotEmpty()
	targetType: AuditTargetType;

	@ApiProperty({ required: false })
	@IsString()
	@IsOptional()
	targetId?: string;

	@ApiProperty()
	@IsString()
	@IsNotEmpty()
	details: string;

	@ApiProperty({ required: false })
	@IsString()
	@IsOptional()
	ipAddress?: string;

	@ApiProperty({ required: false })
	@IsOptional()
	metadata?: Record<string, any>;
}

export class GetAuditLogsQueryDto {
	@ApiProperty({ required: false })
	@IsInt()
	@Min(1)
	@IsOptional()
	page?: number = 1;

	@ApiProperty({ required: false })
	@IsInt()
	@Min(1)
	@Max(100)
	@IsOptional()
	limit?: number = 20;

	@ApiProperty({ enum: AuditAction, required: false })
	@IsEnum(AuditAction)
	@IsOptional()
	action?: AuditAction;

	@ApiProperty({ enum: AuditTargetType, required: false })
	@IsEnum(AuditTargetType)
	@IsOptional()
	targetType?: AuditTargetType;

	@ApiProperty({ required: false })
	@IsString()
	@IsOptional()
	search?: string;
}

export class AuditLogResponseDto {
	@ApiProperty()
	auditId: string;

	@ApiProperty({ enum: AuditAction })
	action: AuditAction;

	@ApiProperty()
	performedBy: string;

	@ApiProperty()
	performerName: string;

	@ApiProperty({ enum: AuditTargetType })
	targetType: AuditTargetType;

	@ApiProperty()
	targetId: string;

	@ApiProperty()
	details: string;

	@ApiProperty()
	ipAddress: string;

	@ApiProperty()
	metadata: Record<string, any>;

	@ApiProperty()
	createdAt: Date;
}

export class AuditLogsListResponseDto {
	@ApiProperty({ type: [AuditLogResponseDto] })
	logs: AuditLogResponseDto[];

	@ApiProperty()
	total: number;

	@ApiProperty()
	page: number;

	@ApiProperty()
	limit: number;

	@ApiProperty()
	totalPages: number;
}
