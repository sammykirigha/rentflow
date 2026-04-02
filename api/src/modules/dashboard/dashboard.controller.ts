import { Controller, Get, Query, UseGuards, UseInterceptors, ClassSerializerInterceptor } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
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

	@Get('analytics')
	@RequirePermissions(Permission(PermissionResource.REPORTS, PermissionAction.READ))
	@ApiOperation({ summary: 'Get revenue analytics with monthly trends and collection rates' })
	@ApiQuery({ name: 'months', required: false, type: Number, description: 'Number of months to include (default 12)' })
	@ApiResponse({ status: 200, description: 'Revenue analytics retrieved successfully' })
	async getAnalytics(@Query('months') months?: number) {
		return await this.dashboardService.getRevenueAnalytics(months || 12);
	}

	@Get('aging-report')
	@RequirePermissions(Permission(PermissionResource.REPORTS, PermissionAction.READ))
	@ApiOperation({ summary: 'Get aging report with outstanding balances bucketed by age' })
	@ApiResponse({ status: 200, description: 'Aging report retrieved successfully' })
	async getAgingReport() {
		return await this.dashboardService.getAgingReport();
	}

	@Get('property-pnl')
	@RequirePermissions(Permission(PermissionResource.REPORTS, PermissionAction.READ))
	@ApiOperation({ summary: 'Get per-property profit and loss report' })
	@ApiQuery({ name: 'startDate', required: false, type: String })
	@ApiQuery({ name: 'endDate', required: false, type: String })
	@ApiResponse({ status: 200, description: 'Property P&L report retrieved successfully' })
	async getPropertyPnl(
		@Query('startDate') startDate?: string,
		@Query('endDate') endDate?: string,
	) {
		return await this.dashboardService.getPropertyPnl(startDate, endDate);
	}

	@Get('expiring-leases')
	@RequirePermissions(Permission(PermissionResource.REPORTS, PermissionAction.READ))
	@ApiOperation({ summary: 'Get leases expiring within the specified number of days' })
	@ApiQuery({ name: 'withinDays', required: false, type: Number, description: 'Days to look ahead (default 90)' })
	@ApiResponse({ status: 200, description: 'Expiring leases retrieved successfully' })
	async getExpiringLeases(@Query('withinDays') withinDays?: number) {
		return await this.dashboardService.getExpiringLeases(withinDays || 90);
	}

	@Get('cash-flow-forecast')
	@RequirePermissions(Permission(PermissionResource.REPORTS, PermissionAction.READ))
	@ApiOperation({ summary: 'Get cash flow forecast for the next N months' })
	@ApiQuery({ name: 'months', required: false, type: Number, description: 'Months to forecast (default 6)' })
	@ApiResponse({ status: 200, description: 'Cash flow forecast retrieved successfully' })
	async getCashFlowForecast(@Query('months') months?: number) {
		return await this.dashboardService.getCashFlowForecast(months || 6);
	}
}
