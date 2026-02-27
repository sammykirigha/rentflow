import {
	Body,
	ClassSerializerInterceptor,
	Controller,
	Get,
	Param,
	ParseIntPipe,
	Patch,
	Post,
	Query,
	UseGuards,
	UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Permission, RequirePermissions } from '@/common/decorators/permissions.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { JwtPayload } from '@/common/interfaces/jwt-payload.interface';
import { PermissionAction, PermissionResource } from '@/modules/permissions/entities/permission.entity';
import { ExpenseCategory, ExpenseStatus } from '@/modules/expenses/entities/expense.entity';
import { CreateMaintenanceRequestDto } from './dto/create-maintenance-request.dto';
import { UpdateMaintenanceRequestDto } from './dto/update-maintenance-request.dto';
import { MaintenanceService } from './maintenance.service';

@Controller('maintenance')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@UseInterceptors(ClassSerializerInterceptor)
@ApiSecurity('bearer')
@ApiBearerAuth('JWT')
@ApiTags('Maintenance')
export class MaintenanceController {
	constructor(private readonly maintenanceService: MaintenanceService) {}

	@Post()
	@ApiOperation({ summary: 'Create a new maintenance request' })
	async create(
		@Body() createMaintenanceRequestDto: CreateMaintenanceRequestDto,
		@CurrentUser() user: JwtPayload,
	) {
		return this.maintenanceService.create(createMaintenanceRequestDto, user.sub);
	}

	@Get()
	@RequirePermissions(Permission(PermissionResource.MAINTENANCE, PermissionAction.READ))
	@ApiOperation({ summary: 'List maintenance requests with pagination and filters' })
	@ApiQuery({ name: 'page', required: false, type: Number })
	@ApiQuery({ name: 'limit', required: false, type: Number })
	@ApiQuery({ name: 'tenantId', required: false, type: String })
	@ApiQuery({ name: 'propertyId', required: false, type: String })
	@ApiQuery({ name: 'status', required: false, enum: ExpenseStatus })
	@ApiQuery({ name: 'category', required: false, enum: ExpenseCategory })
	async findAll(
		@Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
		@Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
		@Query('tenantId') tenantId?: string,
		@Query('propertyId') propertyId?: string,
		@Query('status') status?: ExpenseStatus,
		@Query('category') category?: ExpenseCategory,
	) {
		return this.maintenanceService.findAll({ page, limit, tenantId, propertyId, status, category });
	}

	@Get('my')
	@ApiOperation({ summary: 'Get maintenance requests for the currently logged-in tenant' })
	@ApiQuery({ name: 'page', required: false, type: Number })
	@ApiQuery({ name: 'limit', required: false, type: Number })
	@ApiQuery({ name: 'status', required: false, enum: ExpenseStatus })
	@ApiQuery({ name: 'category', required: false, enum: ExpenseCategory })
	async findMyRequests(
		@CurrentUser() user: JwtPayload,
		@Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
		@Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
		@Query('status') status?: ExpenseStatus,
		@Query('category') category?: ExpenseCategory,
	) {
		const tenant = await this.maintenanceService.findTenantByUserId(user.sub);
		return this.maintenanceService.findAll({ page, limit, tenantId: tenant.tenantId, status, category });
	}

	@Get(':maintenanceRequestId')
	@ApiOperation({ summary: 'Get a single maintenance request by ID' })
	async findOne(@Param('maintenanceRequestId') maintenanceRequestId: string) {
		return this.maintenanceService.findOne(maintenanceRequestId);
	}

	@Patch(':maintenanceRequestId')
	@ApiOperation({ summary: 'Update a maintenance request' })
	async update(
		@Param('maintenanceRequestId') maintenanceRequestId: string,
		@Body() updateMaintenanceRequestDto: UpdateMaintenanceRequestDto,
		@CurrentUser() user: JwtPayload,
	) {
		return this.maintenanceService.update(maintenanceRequestId, updateMaintenanceRequestDto, user.sub);
	}
}
