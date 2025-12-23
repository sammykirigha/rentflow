import {
	Controller,
	Get,
	Post,
	Put,
	Delete,
	Body,
	Param,
	UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PermissionsService } from './permissions.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';

@ApiTags('Permissions')
@Controller('permissions')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
export class PermissionsController {
	constructor(private readonly permissionsService: PermissionsService) {}

	@Get()
	@ApiOperation({ summary: 'Get all available permissions' })
	async getAllPermissions() {
		return this.permissionsService.getAllPermissions();
	}

	@Get('roles')
	@ApiOperation({ summary: 'Get all roles' })
	async getAllRoles() {
		return this.permissionsService.getAllRoles();
	}

	@Get('roles/:roleId')
	@ApiOperation({ summary: 'Get role by ID with permissions' })
	async getRoleById(@Param('roleId') roleId: string) {
		return this.permissionsService.getRoleById(roleId);
	}

	@Put('roles/:roleId')
	@ApiOperation({ summary: 'Update role permissions' })
	async updateRolePermissions(
		@Param('roleId') roleId: string,
		@Body() updateDto: UpdateRolePermissionsDto,
	) {
		return this.permissionsService.updateRolePermissions(roleId, updateDto);
	}

	@Post('roles')
	@ApiOperation({ summary: 'Create custom role' })
	async createRole(@Body() createRoleDto: CreateRoleDto) {
		return this.permissionsService.createCustomRole(createRoleDto);
	}

	@Delete('roles/:roleId')
	@ApiOperation({ summary: 'Delete custom role' })
	async deleteRole(@Param('roleId') roleId: string) {
		await this.permissionsService.deleteRole(roleId);
		return { message: 'Role deleted successfully' };
	}
}
