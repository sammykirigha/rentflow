import { UserRole } from '@/common/enums/user-role.enum';
import { MANAGER_PERMISSIONS, SYSTEM_PERMISSIONS } from '@/modules/permissions/constants/permissions.constant';
import { Permission } from '@/modules/permissions/entities/permission.entity';
import { Role } from '@/modules/permissions/entities/role.entity';
import { DataSource } from 'typeorm';

export class PermissionsSeed {
	async run(dataSource: DataSource): Promise<void> {
		try {
			const permissionRepository = dataSource.getRepository(Permission);
			const roleRepository = dataSource.getRepository(Role);

			// Create all system permissions
			const permissionsMap = new Map<string, Permission>();
			for (const permDef of SYSTEM_PERMISSIONS) {
				let permission = await permissionRepository.findOne({
					where: {
						resource: permDef.resource,
						action: permDef.action,
					},
				});

				if (!permission) {
					permission = await permissionRepository.save({
						resource: permDef.resource,
						action: permDef.action,
						name: permDef.name,
						description: permDef.description,
					});
					console.log(`  Created permission: ${permDef.name}`);
				}

				const key = `${permDef.resource}:${permDef.action}`;
				permissionsMap.set(key, permission);
			}

			// Create Landlord role with all permissions
			let landlordRole = await roleRepository.findOne({
				where: { name: UserRole.LANDLORD },
				relations: ['permissions'],
			});

			const allPermissions = await permissionRepository.find();

			if (!landlordRole) {
				landlordRole = await roleRepository.save({
					name: UserRole.LANDLORD,
					description: 'Full system access - property owner',
					isSystemRole: true,
					isAdminRole: true,
					permissions: allPermissions,
				});
				console.log(`  Created role: ${UserRole.LANDLORD} with ${allPermissions.length} permissions`);
			} else {
				landlordRole.permissions = allPermissions;
				await roleRepository.save(landlordRole);
				console.log(`  Updated role: ${UserRole.LANDLORD}`);
			}

			// Create Manager role with restricted permissions
			let managerRole = await roleRepository.findOne({
				where: { name: UserRole.MANAGER },
				relations: ['permissions'],
			});

			const managerPermissions = Array.from(permissionsMap.entries())
				.filter(([key]) => MANAGER_PERMISSIONS.includes(key))
				.map(([_, permission]) => permission);

			if (!managerRole) {
				managerRole = await roleRepository.save({
					name: UserRole.MANAGER,
					description: 'Property manager access',
					isSystemRole: true,
					isAdminRole: true,
					permissions: managerPermissions,
				});
				console.log(`  Created role: ${UserRole.MANAGER} with ${managerPermissions.length} permissions`);
			} else {
				managerRole.permissions = managerPermissions;
				await roleRepository.save(managerRole);
				console.log(`  Updated role: ${UserRole.MANAGER}`);
			}

			// Create Tenant role (read own data only)
			let tenantRole = await roleRepository.findOne({
				where: { name: UserRole.TENANT },
				relations: ['permissions'],
			});

			if (!tenantRole) {
				tenantRole = await roleRepository.save({
					name: UserRole.TENANT,
					description: 'Tenant access - view own data',
					isSystemRole: true,
					isAdminRole: false,
					permissions: [],
				});
				console.log(`  Created role: ${UserRole.TENANT}`);
			}

			console.log('Permissions and roles seeding complete!');
		} catch (error) {
			console.error('Error during permissions and roles seeding:', error.message);
		}
	}
}
