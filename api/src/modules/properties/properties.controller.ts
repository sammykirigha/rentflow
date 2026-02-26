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
	ParseBoolPipe,
	ParseIntPipe,
	Patch,
	Post,
	Query,
	UseGuards,
	UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { PropertiesService } from './properties.service';

@ApiTags('Properties')
@Controller('properties')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiSecurity('bearer')
@ApiBearerAuth('JWT')
export class PropertiesController {
	constructor(private readonly propertiesService: PropertiesService) { }

	@Post()
	@RequirePermissions(Permission(PermissionResource.PROPERTIES, PermissionAction.CREATE))
	@ApiOperation({ summary: 'Create a new property' })
	@ApiResponse({ status: 201, description: 'Property created successfully' })
	async create(
		@Body() createPropertyDto: CreatePropertyDto,
		@CurrentUser() user: JwtPayload,
	) {
		return await this.propertiesService.create(createPropertyDto, user.sub);
	}

	@Get()
	@RequirePermissions(Permission(PermissionResource.PROPERTIES, PermissionAction.READ))
	@ApiOperation({ summary: 'List all properties with pagination and search' })
	@ApiResponse({ status: 200, description: 'Properties retrieved successfully' })
	@ApiQuery({ name: 'page', required: false, type: Number })
	@ApiQuery({ name: 'limit', required: false, type: Number })
	@ApiQuery({ name: 'search', required: false, type: String })
	@ApiQuery({ name: 'isActive', required: false, type: Boolean })
	async findAll(
		@Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
		@Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
		@Query('search') search?: string,
		@Query('isActive', new ParseBoolPipe({ optional: true })) isActive?: boolean,
	) {
		return await this.propertiesService.findAll({ page, limit, search, isActive });
	}

	@Get(':propertyId')
	@RequirePermissions(Permission(PermissionResource.PROPERTIES, PermissionAction.READ))
	@ApiOperation({ summary: 'Get a single property by ID' })
	@ApiResponse({ status: 200, description: 'Property retrieved successfully' })
	@ApiResponse({ status: 404, description: 'Property not found' })
	async findOne(@Param('propertyId') propertyId: string) {
		return await this.propertiesService.findOne(propertyId);
	}

	@Patch(':propertyId')
	@RequirePermissions(Permission(PermissionResource.PROPERTIES, PermissionAction.UPDATE))
	@ApiOperation({ summary: 'Update a property' })
	@ApiResponse({ status: 200, description: 'Property updated successfully' })
	@ApiResponse({ status: 404, description: 'Property not found' })
	async update(
		@Param('propertyId') propertyId: string,
		@Body() updatePropertyDto: UpdatePropertyDto,
		@CurrentUser() user: JwtPayload,
	) {
		return await this.propertiesService.update(propertyId, updatePropertyDto, user.sub);
	}

	@Get(':propertyId/units')
	@RequirePermissions(Permission(PermissionResource.PROPERTIES, PermissionAction.READ))
	@ApiOperation({ summary: 'Get units for a property' })
	@ApiResponse({ status: 200, description: 'Property units retrieved successfully' })
	@ApiResponse({ status: 404, description: 'Property not found' })
	async getPropertyUnits(@Param('propertyId') propertyId: string) {
		return await this.propertiesService.getPropertyUnits(propertyId);
	}
}
