import {
	Body,
	ClassSerializerInterceptor,
	Controller,
	Delete,
	Get,
	Param,
	ParseIntPipe,
	Patch,
	Post,
	Query,
	UseGuards,
	UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { JwtPayload } from '@/common/interfaces/jwt-payload.interface';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { TenantStatus } from './entities/tenant.entity';
import { TenantsService } from './tenants.service';

@Controller('tenants')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@UseInterceptors(ClassSerializerInterceptor)
@ApiBearerAuth('JWT')
@ApiTags('Tenants')
export class TenantsController {
	constructor(private readonly tenantsService: TenantsService) {}

	@Post()
	@ApiOperation({ summary: 'Create a new tenant' })
	async create(
		@Body() createTenantDto: CreateTenantDto,
		@CurrentUser() user: JwtPayload,
	) {
		return this.tenantsService.create(createTenantDto, user.sub);
	}

	@Get()
	@ApiOperation({ summary: 'List tenants with pagination, search, and status filter' })
	@ApiQuery({ name: 'page', required: false, type: Number })
	@ApiQuery({ name: 'limit', required: false, type: Number })
	@ApiQuery({ name: 'status', required: false, enum: TenantStatus })
	@ApiQuery({ name: 'search', required: false, type: String })
	async findAll(
		@Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
		@Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
		@Query('status') status?: TenantStatus,
		@Query('search') search?: string,
	) {
		return this.tenantsService.findAll({ page, limit, status, search });
	}

	@Get(':tenantId')
	@ApiOperation({ summary: 'Get a single tenant by ID' })
	async findOne(@Param('tenantId') tenantId: string) {
		return this.tenantsService.findOne(tenantId);
	}

	@Patch(':tenantId')
	@ApiOperation({ summary: 'Update tenant details' })
	async update(
		@Param('tenantId') tenantId: string,
		@Body() updateTenantDto: UpdateTenantDto,
		@CurrentUser() user: JwtPayload,
	) {
		return this.tenantsService.update(tenantId, updateTenantDto, user.sub);
	}

	@Post(':tenantId/vacate')
	@ApiOperation({ summary: 'Vacate a tenant from their unit' })
	async vacate(
		@Param('tenantId') tenantId: string,
		@CurrentUser() user: JwtPayload,
	) {
		return this.tenantsService.vacate(tenantId, user.sub);
	}

	@Delete(':tenantId')
	@ApiOperation({ summary: 'Permanently delete a vacated tenant and all associated records' })
	async delete(
		@Param('tenantId') tenantId: string,
		@CurrentUser() user: JwtPayload,
	) {
		await this.tenantsService.delete(tenantId, user.sub);
		return { message: 'Tenant and all associated records deleted successfully' };
	}
}
