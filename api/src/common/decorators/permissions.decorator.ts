import {
	PermissionAction,
	PermissionResource,
} from '@/modules/permissions/entities/permission.entity';
import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

export const RequirePermissions = (
	...permissions: Array<{ resource: PermissionResource; action: PermissionAction }>
) => SetMetadata(PERMISSIONS_KEY, permissions);

export const Permission = (resource: PermissionResource, action: PermissionAction) => ({
	resource,
	action,
});
