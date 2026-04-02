import { OrgContextService } from '@/common/services/org-context.service';
import { orgAsyncStorage } from '@/common/services/org-async-context';
import { OrgQueryBuilder } from './org-query-builder';

describe('OrgQueryBuilder', () => {
	let orgContext: OrgContextService;

	beforeEach(() => {
		orgContext = new OrgContextService();
	});

	function createMockQb() {
		return {
			andWhere: jest.fn().mockReturnThis(),
			where: jest.fn().mockReturnThis(),
			getMany: jest.fn().mockResolvedValue([]),
		} as any;
	}

	it('should add org filter for regular users', () => {
		orgAsyncStorage.run({ organizationId: 'org-1', isSuperAdmin: false, impersonatedBy: null }, () => {
			const mockQb = createMockQb();
			const builder = new OrgQueryBuilder(mockQb, orgContext, 'invoice');

			const result = builder.build();

			expect(mockQb.andWhere).toHaveBeenCalledWith(
				'invoice.organization_id = :orgId',
				{ orgId: 'org-1' },
			);
			expect(result).toBe(mockQb);
		});
	});

	it('should NOT add org filter for super admin', () => {
		orgAsyncStorage.run({ organizationId: null, isSuperAdmin: true, impersonatedBy: null }, () => {
			const mockQb = createMockQb();
			const builder = new OrgQueryBuilder(mockQb, orgContext, 'payment');

			const result = builder.build();

			expect(mockQb.andWhere).not.toHaveBeenCalled();
			expect(result).toBe(mockQb);
		});
	});

	it('should NOT add filter when organizationId is null (non-super-admin)', () => {
		orgAsyncStorage.run({ organizationId: null, isSuperAdmin: false, impersonatedBy: null }, () => {
			const mockQb = createMockQb();
			const builder = new OrgQueryBuilder(mockQb, orgContext, 'tenant');

			builder.build();

			expect(mockQb.andWhere).not.toHaveBeenCalled();
		});
	});

	it('should use the correct alias in WHERE clause', () => {
		orgAsyncStorage.run({ organizationId: 'org-1', isSuperAdmin: false, impersonatedBy: null }, () => {
			const mockQb = createMockQb();
			const builder = new OrgQueryBuilder(mockQb, orgContext, 'myAlias');

			builder.build();

			expect(mockQb.andWhere).toHaveBeenCalledWith(
				'myAlias.organization_id = :orgId',
				{ orgId: 'org-1' },
			);
		});
	});
});
