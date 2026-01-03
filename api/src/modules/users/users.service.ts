import { AuditAction } from '@/common/enums/audit-action.enum';
import { AuditTargetType } from '@/common/enums/audit-target-type.enum';
import authConfig from '@/config/auth.config';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { FindOptionsWhere, ILike, In, Not, Repository } from 'typeorm';
import { UserRole } from '../../common/enums/user-role.enum';
import { UserStatus } from '../../common/enums/user-status.enum';
import { AuditService } from '../audit/audit.service';
import { Role } from '../permissions/entities/role.entity';
import { PermissionsService } from '../permissions/permissions.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { User } from './entities/user.entity';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
	constructor(
		private readonly usersRepository: UsersRepository,
		private permissionsService: PermissionsService,
		@InjectRepository(Role)
		private readonly rolesRepository: Repository<Role>,
		private readonly auditService: AuditService
	) { }

	async create(createUserDto: CreateUserDto): Promise<User> {
		const existingUser = await this.usersRepository.findOne({ where: { email: createUserDto.email } });

		if (existingUser) {
			throw new ConflictException('User with this email already exists');
		}

		const hashedPassword = await bcrypt.hash(createUserDto.password, authConfig.bcryptRounds);
		const userData = {
			...createUserDto,
			password: hashedPassword,
		};

		return this.usersRepository.create(userData);
	}

	async findAll({ page = 1, limit = 10, role, status, search }: { page: number, limit: number, role?: UserRole, status?: string, search?: string; }): Promise<{
		data: User[];
		pagination: {
			page: number;
			limit: number;
			total: number;
			totalPages: number;
		};
	}> {
		const skip = (page - 1) * limit;
		let where: FindOptionsWhere<User> = {
			userRole: {
				name: role ? role : Not(In([UserRole.ADMIN, UserRole.SUPER_ADMIN])),
			}
		};

		if (status) {
			where.status = status.toUpperCase() as UserStatus;
		}

		if (search) {
			// where.firstName = ILike(`%${search}%`);
			// where.lastName = ILike(`%${search}%`);
			where.email = ILike(`%${search}%`);
		}

		const [users, total] = await this.usersRepository['repository'].findAndCount({
			where,
			skip,
			take: limit,
			order: { createdAt: 'DESC' },
		});

		return {
			data: users,
			pagination: {
				page,
				limit,
				total,
				totalPages: Math.ceil(total / limit),
			},
		};
	}

	async findOne(id: string): Promise<User> {
		const user = await this.usersRepository.findOne({ where: { userId: id }, relations: { userRole: true }, });
		if (!user) {
			throw new NotFoundException('User not found');
		}
		return user;
	}

	async findByEmail(email: string): Promise<User> {
		return await this.usersRepository.findOne({
			where: { email },
			relations: { userRole: true },
		});
	}

	async findByResetToken(resetPasswordToken: string): Promise<User> {
		const user = await this.usersRepository.findOne({
			where: {
				resetPasswordToken
			}
		});

		// Check if token exists and is not expired
		if (!user || !user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
			return null;
		}

		return user;
	}

	async updateResetToken(userId: string, resetPasswordToken: string, resetPasswordExpires: Date): Promise<void> {
		await this.usersRepository.update(
			{ userId },
			{ resetPasswordToken, resetPasswordExpires }
		);
	}

	async clearResetToken(userId: string): Promise<void> {
		await this.usersRepository.update(
			{ userId },
			{ resetPasswordToken: null, resetPasswordExpires: null }
		);
	}

	async updatePassword(userId: string, newPassword: string): Promise<void> {
		const hashedPassword = await bcrypt.hash(newPassword, authConfig.bcryptRounds);
		await this.usersRepository.update(
			{ userId },
			{ password: hashedPassword }
		);
	}

	async checkIfOnboarded(userId: string): Promise<{ isOnboarded: boolean; }> {
		const user = await this.usersRepository.findOne({ where: { userId } });

		if (!user) {
			throw new NotFoundException('User not found');
		}

		return { isOnboarded: user.isOnboarded };
	}

	async updateUserStatus(
		userId: string,
		updateUserStatusDto: UpdateUserStatusDto,
		adminId: string,
		adminName: string,
		ipAddress?: string
	): Promise<User> {
		const user = await this.usersRepository.findOne({ where: { userId } });

		if (!user) {
			throw new NotFoundException('User not found');
		}

		// If suspending, require a reason
		if (updateUserStatusDto.status === UserStatus.SUSPENDED && !updateUserStatusDto.reason) {
			throw new BadRequestException('Suspension reason is required');
		}

		const oldStatus = user.status;
		const updateData: any = {
			status: updateUserStatusDto.status,
		};

		if (updateUserStatusDto.status === UserStatus.SUSPENDED) {
			updateData.suspensionReason = updateUserStatusDto.reason;
		} else {
			updateData.suspensionReason = null;
		}

		await this.usersRepository.update(
			{ userId },
			updateData
		);

		const updatedUser = await this.usersRepository.findOne({ where: { userId } });

		// Create audit log based on the action taken
		let auditAction: AuditAction;
		let actionDescription: string;

		switch (updateUserStatusDto.status) {
			case UserStatus.SUSPENDED:
				auditAction = AuditAction.USER_SUSPENDED;
				actionDescription = `Suspended user "${user.fullName}" (${user.email}) - Reason: ${updateUserStatusDto.reason}`;
				break;
			case UserStatus.ACTIVE:
				auditAction = oldStatus === UserStatus.SUSPENDED
					? AuditAction.USER_REACTIVATED
					: AuditAction.USER_UPDATED;
				actionDescription = oldStatus === UserStatus.SUSPENDED
					? `Reactivated user "${user.fullName}" (${user.email}) from suspended status`
					: `Updated user "${user.fullName}" (${user.email}) status to active`;
				break;
			case UserStatus.INACTIVE:
				auditAction = AuditAction.USER_UPDATED;
				actionDescription = `Set user "${user.fullName}" (${user.email}) status to inactive`;
				break;
			default:
				auditAction = AuditAction.USER_UPDATED;
				actionDescription = `Updated user "${user.fullName}" (${user.email}) status`;
		}

		// Log the action
		await this.auditService.createLog({
			action: auditAction,
			performedBy: adminId,
			performerName: adminName,
			targetType: AuditTargetType.USER,
			targetId: userId,
			details: actionDescription,
			ipAddress,
			metadata: {
				userId: user.userId,
				userEmail: user.email,
				userFullName: user.fullName,
				previousStatus: oldStatus,
				newStatus: updateUserStatusDto.status,
				suspensionReason: updateUserStatusDto.reason,
				role: user.roleId
			}
		});

		return updatedUser;
	}

	async getAdmins(page: number = 1, limit: number = 10, search?: string) {
		const skip = (page - 1) * limit;
		let whereSearch: FindOptionsWhere<User>[] = [];

		// Add search functionality
		if (search) {
			whereSearch = [
				{ email: ILike(`%${search}%`) },
				{ firstName: ILike(`%${search}%`) },
				{ lastName: ILike(`%${search}%`) },
			];
		}

		const [users, total] = await this.usersRepository.findAndCount({
			where: search ? whereSearch : {
			},
			skip,
			take: limit,
			order: { createdAt: 'DESC' },
		});

		return {
			data: users,
			pagination: {
				page,
				limit,
				total,
				totalPages: Math.ceil(total / limit),
			},
		};
	}

	async createAdmin(createAdminDto: CreateAdminDto, creatorId: string): Promise<User> {
		// Check if user already exists
		const existingUser = await this.usersRepository.findOne({ where: { email: createAdminDto.email } });

		if (existingUser) {
			throw new ConflictException('User with this email already exists');
		}

		const role = await this.permissionsService.getRoleById(createAdminDto.roleId);
		if (!role) {
			throw new BadRequestException('Role not found. Please contact support.');
		}

		if (!role.isAdminRole) {
			throw new BadRequestException('Assigned role is not an admin role');
		}

		const hashedPassword = await bcrypt.hash(createAdminDto.password, authConfig.bcryptRounds);
		const userData = {
			...createAdminDto,
			password: hashedPassword,
			isAdminUser: true,
			role: role.name,
			roleId: role.roleId,
			status: UserStatus.ACTIVE,
		};

		return this.usersRepository.create(userData);
	}

	async updateUserRole(userId: string, roleId: string, adminId: string): Promise<User> {
		const user = await this.usersRepository.findOne({ where: { userId } });

		if (!user) {
			throw new NotFoundException('User not found');
		}

		const role = await this.rolesRepository.findOne({ where: { roleId } });

		if (!role) {
			throw new NotFoundException('Role not found');
		}

		// Prevent changing own role
		const admin = await this.usersRepository.findOne({ where: { userId: adminId } });
		if (admin.userId === userId) {
			throw new BadRequestException('Cannot change your own role');
		}

		await this.usersRepository.update(
			{ userId },
			{
				roleId: role.roleId,
			}
		);

		return this.usersRepository.findOne({ where: { userId } });
	}

	async updateLastLogin(userId: string): Promise<void> {
		await this.usersRepository.update(
			{ userId },
			{ lastLoginAt: new Date() }
		);
	}

	async updateProfile(userId: string, updateData: { firstName?: string; lastName?: string; email?: string; phone?: string; }): Promise<User> {
		const user = await this.usersRepository.findOne({ where: { userId } });

		if (!user) {
			throw new NotFoundException('User not found');
		}

		// Check if email is being changed and if it's already taken
		if (updateData.email && updateData.email !== user.email) {
			const existingUser = await this.usersRepository.findOne({ where: { email: updateData.email } });
			if (existingUser) {
				throw new ConflictException('Email is already in use');
			}
		}

		await this.usersRepository.update(
			{ userId },
			updateData
		);

		return this.usersRepository.findOne({ where: { userId } });
	}

	async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
		const user = await this.usersRepository.findOne({ where: { userId } });
		if (!user) {
			throw new NotFoundException('User not found');
		}

		// Verify current password
		const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
		if (!isPasswordValid) {
			throw new BadRequestException('Current password is incorrect');
		}

		// Hash and update new password
		const hashedPassword = await bcrypt.hash(newPassword, authConfig.bcryptRounds);
		await this.usersRepository.update(
			{ userId },
			{ password: hashedPassword }
		);
	}
}