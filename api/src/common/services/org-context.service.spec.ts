import { orgAsyncStorage } from './org-async-context';
import { OrgContextService } from './org-context.service';

describe('OrgContextService', () => {
	let service: OrgContextService;

	beforeEach(() => {
		service = new OrgContextService();
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});

	describe('organizationId', () => {
		it('should default to null when no ALS context', () => {
			expect(service.organizationId).toBeNull();
		});

		it('should read organizationId from ALS context', () => {
			orgAsyncStorage.run({ organizationId: 'org-123', isSuperAdmin: false, impersonatedBy: null }, () => {
				expect(service.organizationId).toBe('org-123');
			});
		});

		it('should return null when ALS context has null organizationId', () => {
			orgAsyncStorage.run({ organizationId: null, isSuperAdmin: false, impersonatedBy: null }, () => {
				expect(service.organizationId).toBeNull();
			});
		});
	});

	describe('isSuperAdmin', () => {
		it('should default to false when no ALS context', () => {
			expect(service.isSuperAdmin).toBe(false);
		});

		it('should read isSuperAdmin from ALS context', () => {
			orgAsyncStorage.run({ organizationId: null, isSuperAdmin: true, impersonatedBy: null }, () => {
				expect(service.isSuperAdmin).toBe(true);
			});
		});
	});

	describe('impersonatedBy', () => {
		it('should default to null when no ALS context', () => {
			expect(service.impersonatedBy).toBeNull();
		});

		it('should read impersonatedBy from ALS context', () => {
			orgAsyncStorage.run({ organizationId: 'org-1', isSuperAdmin: false, impersonatedBy: 'admin-user-1' }, () => {
				expect(service.impersonatedBy).toBe('admin-user-1');
			});
		});
	});

	describe('requireOrganizationId', () => {
		it('should return organizationId when set in ALS', () => {
			orgAsyncStorage.run({ organizationId: 'org-456', isSuperAdmin: false, impersonatedBy: null }, () => {
				expect(service.requireOrganizationId()).toBe('org-456');
			});
		});

		it('should throw when organizationId is null', () => {
			orgAsyncStorage.run({ organizationId: null, isSuperAdmin: false, impersonatedBy: null }, () => {
				expect(() => service.requireOrganizationId()).toThrow(
					'Organization context is required but not set',
				);
			});
		});

		it('should throw when no ALS context exists', () => {
			expect(() => service.requireOrganizationId()).toThrow(Error);
		});
	});
});
