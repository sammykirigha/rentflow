import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { SuperAdminGuard } from './super-admin.guard';

function createMockContext(user: any): ExecutionContext {
	return {
		switchToHttp: () => ({
			getRequest: () => ({ user }),
		}),
	} as unknown as ExecutionContext;
}

describe('SuperAdminGuard', () => {
	let guard: SuperAdminGuard;

	beforeEach(() => {
		guard = new SuperAdminGuard();
	});

	it('should allow super admin access', () => {
		const context = createMockContext({ isSuperAdmin: true });
		expect(guard.canActivate(context)).toBe(true);
	});

	it('should deny access when user is not super admin', () => {
		const context = createMockContext({ isSuperAdmin: false });

		expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
		expect(() => guard.canActivate(context)).toThrow('Super admin access required');
	});

	it('should deny access when user is null', () => {
		const context = createMockContext(null);

		expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
	});

	it('should deny access when user is undefined', () => {
		const context = createMockContext(undefined);

		expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
	});

	it('should deny when user has no isSuperAdmin field', () => {
		const context = createMockContext({ email: 'user@test.com' });

		expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
	});
});
