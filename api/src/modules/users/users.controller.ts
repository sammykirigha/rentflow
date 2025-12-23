import { PermissionAction, PermissionResource } from '@/modules/permissions/entities/permission.entity';
import {
	Body,
	ClassSerializerInterceptor,
	Controller,
	Get,
	Ip,
	Param,
	ParseIntPipe,
	Patch,
	Post,
	Query,
	UseGuards,
	UseInterceptors
} from '@nestjs/common';
import { ApiBearerAuth, ApiSecurity } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permission, RequirePermissions } from '../../common/decorators/permissions.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseInterceptors(ClassSerializerInterceptor)
@ApiSecurity('bearer')
@ApiBearerAuth('JWT')
export class UsersController {
	constructor(private readonly usersService: UsersService) { }

	@Post()
	@UseGuards(JwtAuthGuard, PermissionsGuard)
	@RequirePermissions(Permission(PermissionResource.USERS, PermissionAction.CREATE))
	create(@Body() createUserDto: CreateUserDto, @CurrentUser() user: JwtPayload) {
		return this.usersService.create(createUserDto);
	}

	@Get()
	@UseGuards(JwtAuthGuard, PermissionsGuard)
	@RequirePermissions(Permission(PermissionResource.USERS, PermissionAction.READ))
	async findAll(
		@Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
		@Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
		@Query('role') role?: UserRole,
		@Query('status') status?: string,
		@Query('search') search?: string
	) {
		return await this.usersService.findAll({ page, limit, role, status, search });
	}

	@Get('admins')
	@UseGuards(JwtAuthGuard, PermissionsGuard)
	@RequirePermissions(Permission(PermissionResource.USERS, PermissionAction.READ))
	async getAdmins(
		@Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
		@Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
		@Query('search') search?: string
	) {
		return await this.usersService.getAdmins(page, limit, search);
	}

	@Post('admins')
	@UseGuards(JwtAuthGuard, PermissionsGuard)
	@RequirePermissions(Permission(PermissionResource.USERS, PermissionAction.CREATE))
	async createAdmin(
		@Body() createAdminDto: CreateAdminDto,
		@CurrentUser() admin: JwtPayload
	) {
		return await this.usersService.createAdmin(createAdminDto, admin.sub);
	}

	@Patch(':userId/role')
	@UseGuards(JwtAuthGuard, PermissionsGuard)
	@RequirePermissions(Permission(PermissionResource.USERS, PermissionAction.UPDATE))
	async updateUserRole(
		@Param('userId') userId: string,
		@Body('roleId') roleId: string,
		@CurrentUser() admin: JwtPayload
	) {
		return await this.usersService.updateUserRole(userId, roleId, admin.sub);
	}

	@Patch(':userId/status')
	@UseGuards(JwtAuthGuard, PermissionsGuard)
	@RequirePermissions(Permission(PermissionResource.USERS, PermissionAction.UPDATE))
	async updateUserStatus(
		@Param('userId') userId: string,
		@Body() updateUserStatusDto: UpdateUserStatusDto,
		@CurrentUser() admin: JwtPayload,
		@Ip() ipAddress: string
	) {
		const adminUser = await this.usersService.findOne(admin.sub);
		return await this.usersService.updateUserStatus(
			userId,
			updateUserStatusDto,
			admin.sub,
			adminUser.fullName,
			ipAddress
		);
	}

	@Get('profile')
	@UseGuards(JwtAuthGuard)
	getProfile(@CurrentUser() user: JwtPayload) {
		return this.usersService.findOne(user.sub);
	}

	@Patch('profile')
	@UseGuards(JwtAuthGuard)
	async updateProfile(
		@CurrentUser() user: JwtPayload,
		@Body() updateProfileDto: UpdateProfileDto
	) {
		const updatedUser = await this.usersService.updateProfile(user.sub, updateProfileDto);
		return {
			success: true,
			data: updatedUser,
			message: 'Profile updated successfully'
		};
	}

	@Post('change-password')
	@UseGuards(JwtAuthGuard)
	async changePassword(
		@CurrentUser() user: JwtPayload,
		@Body() changePasswordDto: ChangePasswordDto
	) {
		await this.usersService.changePassword(
			user.sub,
			changePasswordDto.currentPassword,
			changePasswordDto.newPassword
		);
		return {
			success: true,
			message: 'Password changed successfully'
		};
	}

}