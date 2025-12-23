import {
	PermissionAction,
	PermissionResource,
} from '@/modules/permissions/entities/permission.entity';
import {
	CanActivate,
	ExecutionContext,
	ForbiddenException,
	Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { UserRole } from '../enums/user-role.enum';

@Injectable()
export class PermissionsGuard implements CanActivate {
	constructor(private reflector: Reflector) {}

	canActivate(context: ExecutionContext): boolean {
		const requiredPermissions = this.reflector.getAllAndOverride<Array<{
			resource: PermissionResource; action: PermissionAction;
		}>>(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

		if (!requiredPermissions || requiredPermissions.length === 0) {
			return true;
		}

		const request = context.switchToHttp().getRequest();
		const user = request.user;

		if (!user) {
			throw new ForbiddenException('User not authenticated');
		}
		
		if (!user.isAdminUser) {
			throw new ForbiddenException('User not authorized to access this resource');
		}
		
		// Super Admin bypasses all permission checks
		if (user.role === UserRole.SUPER_ADMIN || user.userRole?.name === UserRole.SUPER_ADMIN) {
			return true;
		}

		// Check if user has required permissions
		const userPermissions: string[] = user.permissions || [];

		const hasPermission = requiredPermissions.some(({ resource, action }) => {
			const permissionString = `${resource}:${action}`;
			return userPermissions.includes(permissionString);
		});

		if (!hasPermission) {
			throw new ForbiddenException(
				'You do not have permission to perform this action',
			);
		}

		return true;
	}
}
