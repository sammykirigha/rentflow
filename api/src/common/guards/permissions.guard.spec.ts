import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { PermissionAction, PermissionResource } from '@/modules/permissions/entities/permission.entity';
import { UserRole } from '../enums/user-role.enum';

function createMockContext(user: any): ExecutionContext {
	return {
		switchToHttp: () => ({
			getRequest: () => ({ user }),
		}),
		getHandler: () => jest.fn(),
		getClass: () => jest.fn(),
	} as unknown as ExecutionContext;
}

describe('PermissionsGuard', () => {
	let guard: PermissionsGuard;
	let reflector: Reflector;

	beforeEach(() => {
		reflector = new Reflector();
		guard = new PermissionsGuard(reflector);
	});

	it('should allow when no permissions are required', () => {
		jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
		const context = createMockContext({ permissions: [] });

		expect(guard.canActivate(context)).toBe(true);
	});

	it('should allow when empty permissions array', () => {
		jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);
		const context = createMockContext({ permissions: [] });

		expect(guard.canActivate(context)).toBe(true);
	});

	it('should throw when user is not authenticated', () => {
		jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
			{ resource: PermissionResource.PROPERTIES, action: PermissionAction.READ },
		]);
		const context = createMockContext(null);

		expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
		expect(() => guard.canActivate(context)).toThrow('User not authenticated');
	});

	describe('super admin bypass', () => {
		it('should allow super admin regardless of permissions', () => {
			jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
				{ resource: PermissionResource.PROPERTIES, action: PermissionAction.DELETE },
			]);
			const context = createMockContext({
				isSuperAdmin: true,
				permissions: [],
			});

			expect(guard.canActivate(context)).toBe(true);
		});
	});

	describe('org owner bypass', () => {
		it('should allow ORG_OWNER role', () => {
			jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
				{ resource: PermissionResource.INVOICES, action: PermissionAction.CREATE },
			]);
			const context = createMockContext({
				roleName: UserRole.ORG_OWNER,
				permissions: [],
			});

			expect(guard.canActivate(context)).toBe(true);
		});

		it('should allow LANDLORD role (legacy alias)', () => {
			jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
				{ resource: PermissionResource.INVOICES, action: PermissionAction.CREATE },
			]);
			const context = createMockContext({
				roleName: UserRole.LANDLORD,
				permissions: [],
			});

			expect(guard.canActivate(context)).toBe(true);
		});
	});

	describe('non-admin users', () => {
		it('should deny non-admin users', () => {
			jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
				{ resource: PermissionResource.INVOICES, action: PermissionAction.READ },
			]);
			const context = createMockContext({
				roleName: 'ORG_TENANT',
				isAdminUser: false,
				permissions: [],
			});

			expect(() => guard.canActivate(context)).toThrow(
				'User not authorized to access this resource',
			);
		});
	});

	describe('permission checking', () => {
		it('should allow when user has matching permission', () => {
			jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
				{ resource: PermissionResource.INVOICES, action: PermissionAction.READ },
			]);
			const context = createMockContext({
				roleName: 'ORG_MANAGER',
				isAdminUser: true,
				permissions: ['invoices:read', 'invoices:create'],
			});

			expect(guard.canActivate(context)).toBe(true);
		});

		it('should allow when user has any of the required permissions', () => {
			jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
				{ resource: PermissionResource.INVOICES, action: PermissionAction.READ },
				{ resource: PermissionResource.PAYMENTS, action: PermissionAction.READ },
			]);
			const context = createMockContext({
				roleName: 'ORG_MANAGER',
				isAdminUser: true,
				permissions: ['payments:read'],
			});

			expect(guard.canActivate(context)).toBe(true);
		});

		it('should deny when user has no matching permissions', () => {
			jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
				{ resource: PermissionResource.SETTINGS, action: PermissionAction.UPDATE },
			]);
			const context = createMockContext({
				roleName: 'ORG_MANAGER',
				isAdminUser: true,
				permissions: ['invoices:read', 'payments:read'],
			});

			expect(() => guard.canActivate(context)).toThrow(
				'You do not have permission to perform this action',
			);
		});

		it('should handle undefined permissions array', () => {
			jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
				{ resource: PermissionResource.INVOICES, action: PermissionAction.READ },
			]);
			const context = createMockContext({
				roleName: 'ORG_MANAGER',
				isAdminUser: true,
				permissions: undefined,
			});

			expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
		});
	});
});
