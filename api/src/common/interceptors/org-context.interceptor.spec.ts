import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of } from 'rxjs';
import { OrgContextInterceptor } from './org-context.interceptor';
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

const mockCallHandler = { handle: () => of('test') };

describe('OrgContextInterceptor', () => {
	let interceptor: OrgContextInterceptor;
	let reflector: Reflector;

	beforeEach(() => {
		reflector = new Reflector();
		interceptor = new OrgContextInterceptor(reflector);
	});

	it('should pass through when route is public', (done) => {
		jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
		const context = createMockContext(null);

		interceptor.intercept(context, mockCallHandler).subscribe({
			next: (val) => {
				expect(val).toBe('test');
				done();
			},
		});
	});

	it('should pass through when no user', (done) => {
		jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
		const context = createMockContext(null);

		interceptor.intercept(context, mockCallHandler).subscribe({
			next: (val) => {
				expect(val).toBe('test');
				done();
			},
		});
	});

	it('should populate ALS store with user org context', (done) => {
		orgAsyncStorage.run({ organizationId: null, isSuperAdmin: false, impersonatedBy: null }, () => {
			jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
			const context = createMockContext({
				isSuperAdmin: false,
				organizationId: 'org-1',
				impersonatedBy: null,
			});

			interceptor.intercept(context, mockCallHandler).subscribe({
				next: () => {
					const store = orgAsyncStorage.getStore();
					expect(store?.organizationId).toBe('org-1');
					expect(store?.isSuperAdmin).toBe(false);
					done();
				},
			});
		});
	});

	it('should allow super admin without organization context', (done) => {
		orgAsyncStorage.run({ organizationId: null, isSuperAdmin: false, impersonatedBy: null }, () => {
			jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
			const context = createMockContext({
				isSuperAdmin: true,
				organizationId: null,
			});

			interceptor.intercept(context, mockCallHandler).subscribe({
				next: () => {
					const store = orgAsyncStorage.getStore();
					expect(store?.isSuperAdmin).toBe(true);
					done();
				},
			});
		});
	});

	it('should throw ForbiddenException when non-admin user has no org context', () => {
		orgAsyncStorage.run({ organizationId: null, isSuperAdmin: false, impersonatedBy: null }, () => {
			jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
			const context = createMockContext({
				isSuperAdmin: false,
				organizationId: null,
			});

			expect(() => interceptor.intercept(context, mockCallHandler)).toThrow(ForbiddenException);
			expect(() => interceptor.intercept(context, mockCallHandler)).toThrow(
				'Organization context is required',
			);
		});
	});
});
