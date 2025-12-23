import { UserRole } from '@/common/enums/user-role.enum';
import { PermissionAction, PermissionResource } from '../entities/permission.entity';

export interface PermissionDefinition {
	resource: PermissionResource;
	action: PermissionAction;
	name: string;
	description: string;
}

export const SYSTEM_PERMISSIONS: PermissionDefinition[] = [
	// User Management
	{
		resource: PermissionResource.USERS,
		action: PermissionAction.READ,
		name: 'View Users',
		description: 'View list of all users',
	},
	{
		resource: PermissionResource.USERS,
		action: PermissionAction.CREATE,
		name: 'Create Users',
		description: 'Create new user accounts',
	},
	{
		resource: PermissionResource.USERS,
		action: PermissionAction.UPDATE,
		name: 'Update Users',
		description: 'Update user information and status',
	},
	{
		resource: PermissionResource.USERS,
		action: PermissionAction.DELETE,
		name: 'Delete Users',
		description: 'Delete user accounts',
	},

	// Settings
	{
		resource: PermissionResource.SETTINGS,
		action: PermissionAction.READ,
		name: 'View Settings',
		description: 'View system settings',
	},
	{
		resource: PermissionResource.SETTINGS,
		action: PermissionAction.UPDATE,
		name: 'Update Settings',
		description: 'Modify system settings',
	},

	// AI Models
	{
		resource: PermissionResource.AI_MODELS,
		action: PermissionAction.READ,
		name: 'View AI Models',
		description: 'View AI model configurations',
	},
	{
		resource: PermissionResource.AI_MODELS,
		action: PermissionAction.CREATE,
		name: 'Create AI Models',
		description: 'Create new AI model configurations',
	},
	{
		resource: PermissionResource.AI_MODELS,
		action: PermissionAction.UPDATE,
		name: 'Update AI Models',
		description: 'Update AI model configurations',
	},
	{
		resource: PermissionResource.AI_MODELS,
		action: PermissionAction.DELETE,
		name: 'Delete AI Models',
		description: 'Delete AI model configurations',
	},
	{
		resource: PermissionResource.AI_MODELS,
		action: PermissionAction.VIEW_SENSITIVE,
		name: 'View AI Model API Keys',
		description: 'View decrypted API keys for AI models',
	},

	// Questions
	{
		resource: PermissionResource.QUESTIONS,
		action: PermissionAction.READ,
		name: 'View Questions',
		description: 'View all user questions',
	},
	{
		resource: PermissionResource.QUESTIONS,
		action: PermissionAction.UPDATE,
		name: 'Update Questions',
		description: 'Update question status and responses',
	},
	{
		resource: PermissionResource.QUESTIONS,
		action: PermissionAction.DELETE,
		name: 'Delete Questions',
		description: 'Delete user questions',
	},

	// Reports
	{
		resource: PermissionResource.REPORTS,
		action: PermissionAction.READ,
		name: 'View Reports',
		description: 'View system reports and analytics',
	},
	{
		resource: PermissionResource.REPORTS,
		action: PermissionAction.EXPORT,
		name: 'Export Reports',
		description: 'Export reports and data',
	},
];

// Super Admin has all permissions
export const SUPER_ADMIN_PERMISSIONS = SYSTEM_PERMISSIONS.map(
	(p) => `${p.resource}:${p.action}`,
);

// Default Admin permissions (more restricted)
export const DEFAULT_ADMIN_PERMISSIONS = [
	`${PermissionResource.USERS}:${PermissionAction.READ}`,
	`${PermissionResource.SETTINGS}:${PermissionAction.READ}`,
	`${PermissionResource.AI_MODELS}:${PermissionAction.READ}`,
	`${PermissionResource.AI_MODELS}:${PermissionAction.CREATE}`,
	`${PermissionResource.AI_MODELS}:${PermissionAction.UPDATE}`,
	`${PermissionResource.QUESTIONS}:${PermissionAction.READ}`,
	`${PermissionResource.REPORTS}:${PermissionAction.READ}`,
];

// Role name mappings
export const ROLE_NAMES = {
	SUPER_ADMIN: UserRole.SUPER_ADMIN,
	ADMIN: UserRole.ADMIN,
};
