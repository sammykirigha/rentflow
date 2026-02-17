import { UserRole } from '@/common/enums/user-role.enum';
import {
	BadRequestException,
	ConflictException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import {
	SYSTEM_PERMISSIONS
} from './constants/permissions.constant';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';
import { Permission } from './entities/permission.entity';
import { Role } from './entities/role.entity';

@Injectable()
export class PermissionsService {
	constructor(
		@InjectRepository(Permission)
		private permissionsRepository: Repository<Permission>,
		@InjectRepository(Role)
		private rolesRepository: Repository<Role>,
		private readonly entityManager: EntityManager
	) { }

	async seedPermissions(): Promise<void> {
		// Create all system permissions
		for (const permDef of SYSTEM_PERMISSIONS) {
			const exists = await this.permissionsRepository.findOne({
				where: {
					resource: permDef.resource,
					action: permDef.action,
				},
			});

			if (!exists) {
				await this.permissionsRepository.save({
					resource: permDef.resource,
					action: permDef.action,
					name: permDef.name,
					description: permDef.description,
				});
			}
		}
	}

	async getAllPermissions(): Promise<Permission[]> {
		return this.permissionsRepository.find({
			order: { resource: 'ASC', action: 'ASC' },
		});
	}

	async getAllRoles(): Promise<Role[]> {
		return this.rolesRepository.find({
			relations: ['permissions'],
			order: { name: 'ASC' },
		});
	}

	async getRoleById(roleId: string): Promise<Role> {
		const role = await this.rolesRepository.findOne({
			where: { roleId },
			relations: ['permissions'],
		});

		if (!role) {
			throw new NotFoundException('Role not found');
		}

		return role;
	}

	async getRoleByName(name: string): Promise<Role> {
		const role = await this.rolesRepository.findOne({
			where: { name },
			relations: ['permissions'],
		});

		if (!role) {
			throw new NotFoundException('Role not found');
		}

		return role;
	}

	async updateRolePermissions(roleId: string, updateDto: UpdateRolePermissionsDto): Promise<Role> {
		const role = await this.rolesRepository.findOne({
			where: { roleId },
			relations: ['permissions'],
		});

		if (!role) {
			throw new NotFoundException('Role not found');
		}

		if (role.isSystemRole && role.name === UserRole.LANDLORD) {
			throw new BadRequestException('Cannot modify Landlord role permissions');
		}

		const permissions = await this.permissionsRepository.find({
			where: { permissionId: In(updateDto.permissionIds) },
		});

		if (permissions.length !== updateDto.permissionIds.length) {
			throw new BadRequestException('Some permissions not found');
		}

		await this.entityManager.transaction(async (manager) => {
			// need to clear existing relations first to avoid duplicates
			await manager.clear("role_permissions");

			role.permissions = permissions;
			await manager.save(role);
		});

		return await this.rolesRepository.findOne({
			where: { roleId },
			relations: ['permissions'],
		});
	}

	async createCustomRole(createRoleDto: CreateRoleDto): Promise<Role> {
		const exists = await this.rolesRepository.findOne({
			where: { name: createRoleDto.name },
		});

		if (exists) {
			throw new ConflictException('Role with this name already exists');
		}

		const permissions = await this.permissionsRepository.find({
			where: { permissionId: In(createRoleDto.permissionIds) },
		});

		if (permissions.length !== createRoleDto.permissionIds.length) {
			throw new BadRequestException('Some permissions not found');
		}

		return this.rolesRepository.save({
			name: createRoleDto.name,
			description: createRoleDto.description,
			isSystemRole: false,
			permissions,
		});
	}

	async deleteRole(roleId: string): Promise<void> {
		const role = await this.rolesRepository.findOne({
			where: { roleId },
		});

		if (!role) {
			throw new NotFoundException('Role not found');
		}

		if (role.isSystemRole) {
			throw new BadRequestException('Cannot delete system role');
		}

		await this.rolesRepository.remove(role);
	}

	async getUserPermissions(roleId: string): Promise<string[]> {
		const role = await this.rolesRepository.findOne({
			where: { roleId },
			relations: ['permissions'],
		});

		if (!role) {
			return [];
		}

		return role.permissions.map((p) => `${p.resource}:${p.action}`);
	}
}
