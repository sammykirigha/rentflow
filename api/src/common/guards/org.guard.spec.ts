import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OrgGuard } from './org.guard';
import { orgAsyncStorage } from '../services/org-async-context';

function createMockContext(user: any): ExecutionContext {
	return {
		switchToHttp: () => ({
			getRequest: () => ({ user }),
		}),
		getHandler: () => jest.fn(),
		getClass: () => jest.fn(),
	} as unknown as ExecutionContext;
}

describe('OrgGuard', () => {
	let guard: OrgGuard;
	let reflector: Reflector;

	beforeEach(() => {
		reflector = new Reflector();
		guard = new OrgGuard(reflector);
	});

	it('should allow access when route is public', () => {
		jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
		const context = createMockContext(null);
		expect(guard.canActivate(context)).toBe(true);
	});

	it('should allow access when no user (defers to JwtAuthGuard)', () => {
		jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
		const context = createMockContext(null);
		expect(guard.canActivate(context)).toBe(true);
	});

	it('should allow super admin without organization context', () => {
		orgAsyncStorage.run({ organizationId: null, isSuperAdmin: false, impersonatedBy: null }, () => {
			jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
			const context = createMockContext({
				isSuperAdmin: true,
				organizationId: null,
			});
			expect(guard.canActivate(context)).toBe(true);
		});
	});

	it('should allow regular user with organization context', () => {
		orgAsyncStorage.run({ organizationId: null, isSuperAdmin: false, impersonatedBy: null }, () => {
			jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
			const context = createMockContext({
				isSuperAdmin: false,
				organizationId: 'org-1',
			});
			expect(guard.canActivate(context)).toBe(true);

			const store = orgAsyncStorage.getStore();
			expect(store?.organizationId).toBe('org-1');
		});
	});

	it('should throw ForbiddenException when non-admin user has no org context', () => {
		orgAsyncStorage.run({ organizationId: null, isSuperAdmin: false, impersonatedBy: null }, () => {
			jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
			const context = createMockContext({
				isSuperAdmin: false,
				organizationId: null,
			});

			expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
			expect(() => guard.canActivate(context)).toThrow('Organization context is required');
		});
	});

	it('should throw when user has undefined organizationId', () => {
		orgAsyncStorage.run({ organizationId: null, isSuperAdmin: false, impersonatedBy: null }, () => {
			jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
			const context = createMockContext({
				isSuperAdmin: false,
			});

			expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
		});
	});
});
