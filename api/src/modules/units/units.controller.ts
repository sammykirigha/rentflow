import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Permission, RequirePermissions } from '@/common/decorators/permissions.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { JwtPayload } from '@/common/interfaces/jwt-payload.interface';
import { PermissionAction, PermissionResource } from '@/modules/permissions/entities/permission.entity';
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
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { BulkCreateUnitsDto } from './dto/bulk-create-units.dto';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { UnitsService } from './units.service';

@ApiTags('Units')
@Controller('units')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiSecurity('bearer')
@ApiBearerAuth('JWT')
export class UnitsController {
	constructor(private readonly unitsService: UnitsService) {}

	@Post()
	@RequirePermissions(Permission(PermissionResource.UNITS, PermissionAction.CREATE))
	@ApiOperation({ summary: 'Create a single unit' })
	@ApiResponse({ status: 201, description: 'Unit created successfully' })
	async create(
		@Body() createUnitDto: CreateUnitDto,
		@CurrentUser() user: JwtPayload,
	) {
		return this.unitsService.create(createUnitDto, user.sub);
	}

	@Post('bulk')
	@RequirePermissions(Permission(PermissionResource.UNITS, PermissionAction.CREATE))
	@ApiOperation({ summary: 'Bulk create units for a property' })
	@ApiResponse({ status: 201, description: 'Units created successfully' })
	async bulkCreate(
		@Body() bulkCreateUnitsDto: BulkCreateUnitsDto,
		@CurrentUser() user: JwtPayload,
	) {
		return this.unitsService.bulkCreate(bulkCreateUnitsDto, user.sub);
	}

	@Get('property/:propertyId')
	@RequirePermissions(Permission(PermissionResource.UNITS, PermissionAction.READ))
	@ApiOperation({ summary: 'List units for a property (paginated)' })
	@ApiResponse({ status: 200, description: 'Units retrieved successfully' })
	async findByProperty(
		@Param('propertyId') propertyId: string,
		@Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
		@Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
	) {
		return this.unitsService.findByProperty(propertyId, { page, limit });
	}

	@Get('property/:propertyId/vacant')
	@RequirePermissions(Permission(PermissionResource.UNITS, PermissionAction.READ))
	@ApiOperation({ summary: 'List vacant units for a property' })
	@ApiResponse({ status: 200, description: 'Vacant units retrieved successfully' })
	async getVacantUnits(
		@Param('propertyId') propertyId: string,
	) {
		return this.unitsService.getVacantUnits(propertyId);
	}

	@Get(':unitId')
	@RequirePermissions(Permission(PermissionResource.UNITS, PermissionAction.READ))
	@ApiOperation({ summary: 'Get a single unit by ID' })
	@ApiResponse({ status: 200, description: 'Unit retrieved successfully' })
	@ApiResponse({ status: 404, description: 'Unit not found' })
	async findOne(
		@Param('unitId') unitId: string,
	) {
		return this.unitsService.findOne(unitId);
	}

	@Patch(':unitId')
	@RequirePermissions(Permission(PermissionResource.UNITS, PermissionAction.UPDATE))
	@ApiOperation({ summary: 'Update a unit' })
	@ApiResponse({ status: 200, description: 'Unit updated successfully' })
	@ApiResponse({ status: 404, description: 'Unit not found' })
	async update(
		@Param('unitId') unitId: string,
		@Body() updateUnitDto: UpdateUnitDto,
		@CurrentUser() user: JwtPayload,
	) {
		return this.unitsService.update(unitId, updateUnitDto, user.sub);
	}
}
