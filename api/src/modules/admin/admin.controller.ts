import { Permission, RequirePermissions } from '@/common/decorators/permissions.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { PermissionAction, PermissionResource } from '@/modules/permissions/entities/permission.entity';
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AdminStatsService } from './admin-stats.service';

@ApiTags('Admin Dashboard')
@Controller('admin')
@ApiSecurity('bearer')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminController {
	constructor(private readonly adminStatsService: AdminStatsService) { }

	@Get('stats')
	@RequirePermissions(Permission(PermissionResource.SETTINGS, PermissionAction.READ))
	@ApiOperation({ summary: 'Get admin dashboard statistics' })
	@ApiResponse({ status: 200, description: 'Dashboard statistics retrieved successfully' })
	@ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
	async getDashboardStats() {
		return await this.adminStatsService.getDashboardData();
	}

	@Get('stats/overview')
	@RequirePermissions(Permission(PermissionResource.SETTINGS, PermissionAction.READ))
	@ApiOperation({ summary: 'Get admin stats overview only' })
	@ApiResponse({ status: 200, description: 'Stats overview retrieved successfully' })
	@ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
	async getStatsOverview() {
		return await this.adminStatsService.getAdminStats();
	}

	@Get('stats/recent-users')
	@RequirePermissions(Permission(PermissionResource.USERS, PermissionAction.READ))
	@ApiOperation({ summary: 'Get recent users' })
	@ApiResponse({ status: 200, description: 'Recent users retrieved successfully' })
	@ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
	async getRecentUsers() {
		return await this.adminStatsService.getRecentUsers();
	}
}
