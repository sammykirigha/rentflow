import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { JwtPayload } from '@/common/interfaces/jwt-payload.interface';
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
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { VendorsService } from './vendors.service';

@ApiTags('Vendors')
@Controller('vendors')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiSecurity('bearer')
@ApiBearerAuth('JWT')
export class VendorsController {
	constructor(private readonly vendorsService: VendorsService) { }

	@Post()
	@ApiOperation({ summary: 'Create a new vendor' })
	@ApiResponse({ status: 201, description: 'Vendor created successfully' })
	async create(
		@Body() createVendorDto: CreateVendorDto,
		@CurrentUser() user: JwtPayload,
	) {
		return await this.vendorsService.create(createVendorDto, user.sub);
	}

	@Get()
	@ApiOperation({ summary: 'List all vendors with pagination and search' })
	@ApiResponse({ status: 200, description: 'Vendors retrieved successfully' })
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
		return await this.vendorsService.findAll({ page, limit, search, isActive });
	}

	@Get(':vendorId')
	@ApiOperation({ summary: 'Get a single vendor by ID' })
	@ApiResponse({ status: 200, description: 'Vendor retrieved successfully' })
	@ApiResponse({ status: 404, description: 'Vendor not found' })
	async findOne(@Param('vendorId') vendorId: string) {
		return await this.vendorsService.findOne(vendorId);
	}

	@Patch(':vendorId')
	@ApiOperation({ summary: 'Update a vendor' })
	@ApiResponse({ status: 200, description: 'Vendor updated successfully' })
	@ApiResponse({ status: 404, description: 'Vendor not found' })
	async update(
		@Param('vendorId') vendorId: string,
		@Body() updateVendorDto: UpdateVendorDto,
		@CurrentUser() user: JwtPayload,
	) {
		return await this.vendorsService.update(vendorId, updateVendorDto, user.sub);
	}
}
