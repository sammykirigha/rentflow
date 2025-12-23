import { Permission, RequirePermissions } from '@/common/decorators/permissions.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { PermissionAction, PermissionResource } from '../permissions/entities/permission.entity';
import { AuditService } from './audit.service';
import { AuditLogsListResponseDto, GetAuditLogsQueryDto } from './dto/audit-log.dto';

@ApiTags('Audit Logs')
@ApiSecurity('bearer')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('audit-logs')
export class AuditController {
	constructor(private readonly auditService: AuditService) {}

	@Get()
	@RequirePermissions(Permission(PermissionResource.SETTINGS, PermissionAction.READ))
	@ApiOperation({ summary: 'Get audit logs with pagination and filters' })
	@ApiResponse({
		status: 200,
		description: 'Audit logs retrieved successfully',
		type: AuditLogsListResponseDto
	})
	async getAuditLogs(
		@Query() query: GetAuditLogsQueryDto,
	): Promise<AuditLogsListResponseDto> {
		return await this.auditService.getLogs(query);
	}
}
