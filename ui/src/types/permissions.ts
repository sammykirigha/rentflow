export interface Permission {
	permissionId: string;
	createdAt: string;
	updatedAt: string;
	deletedAt: null;
	resource: string;
	action: string;
	name: string;
	description: string;
}

export interface Role {
	roleId: string;
	name: string;
	description?: string;
	isSystemRole: boolean;
	isAdminRole: boolean;
	permissions: Permission[];
	createdAt?: string;
	updatedAt?: string;
}