import { UserRole } from '@/common/enums/user-role.enum';
import { DEFAULT_ADMIN_PERMISSIONS, SYSTEM_PERMISSIONS } from '@/modules/permissions/constants/permissions.constant';
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
					console.log(`  ✓ Created permission: ${permDef.name}`);
				}

				const key = `${permDef.resource}:${permDef.action}`;
				permissionsMap.set(key, permission);
			}

			// Create Super Admin role with all permissions
			let superAdminRole = await roleRepository.findOne({
				where: { name: UserRole.SUPER_ADMIN },
				relations: ['permissions'],
			});

			const allPermissions = await permissionRepository.find();

			if (!superAdminRole) {
				superAdminRole = await roleRepository.save({
					name: UserRole.SUPER_ADMIN,
					description: 'Full system access',
					isSystemRole: true,
					isAdminRole: true,
					permissions: allPermissions,
				});
				console.log(`  ✓ Created role: ${UserRole.SUPER_ADMIN} with ${allPermissions.length} permissions`);
			} else {
				try {
					superAdminRole.permissions = allPermissions;
					await roleRepository.save(superAdminRole);
					console.log(`  ✓ Updated role: ${UserRole.SUPER_ADMIN}`);
				} catch (error) {
					console.error(`❌ Error updating role: ${UserRole.SUPER_ADMIN}:`, error.message);
				}
			}

			// Create Admin role with restricted permissions
			let adminRole = await roleRepository.findOne({
				where: { name: UserRole.ADMIN },
				relations: ['permissions'],
			});

			const adminPermissions = Array.from(permissionsMap.entries())
				.filter(([key]) => DEFAULT_ADMIN_PERMISSIONS.includes(key))
				.map(([_, permission]) => permission);

			if (!adminRole) {
				adminRole = await roleRepository.save({
					name: UserRole.ADMIN,
					description: 'Standard admin access',
					isSystemRole: true,
					isAdminRole: true,
					permissions: adminPermissions,
				});
				console.log(`  ✓ Created role: ${UserRole.ADMIN} with ${adminPermissions.length} permissions`);
			} else {
				// Update permissions if role already exists
				try {
					adminRole.permissions = adminPermissions;
					await roleRepository.save(adminRole);
					console.log(`  ✓ Updated role: ${UserRole.ADMIN}`);
				} catch (error) {
					console.error(`❌ Error updating role: ${UserRole.ADMIN}:`, error.message);
				}
			}

			// Create userRole role (minimal permissions)
			let userRole = await roleRepository.findOne({
				where: { name: UserRole.USER },
				relations: ['permissions'],
			});

			if (!userRole) {
				userRole = await roleRepository.save({
					name: UserRole.USER,
					description: 'User access',
					isSystemRole: true,
					isAdminRole: false,
					permissions: [],
				});
				console.log(`  ✓ Created role: ${UserRole.USER}`);
			}

			console.log('✅ Permissions and roles seeding complete!');
		} catch (error) {
			console.error('❌ Error during permissions and roles seeding:', error.message);
		}
	}
}
