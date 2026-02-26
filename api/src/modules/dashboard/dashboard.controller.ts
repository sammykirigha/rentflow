import { Controller, Get, UseGuards, UseInterceptors, ClassSerializerInterceptor } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { Permission, RequirePermissions } from '@/common/decorators/permissions.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { PermissionAction, PermissionResource } from '@/modules/permissions/entities/permission.entity';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@Controller('dashboard')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiSecurity('bearer')
@ApiBearerAuth('JWT')
export class DashboardController {
	constructor(private readonly dashboardService: DashboardService) {}

	@Get('stats')
	@RequirePermissions(Permission(PermissionResource.REPORTS, PermissionAction.READ))
	@ApiOperation({ summary: 'Get dashboard statistics' })
	@ApiResponse({ status: 200, description: 'Dashboard stats retrieved successfully' })
	async getStats() {
		return await this.dashboardService.getStats();
	}
}
