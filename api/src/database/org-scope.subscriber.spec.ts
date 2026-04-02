import { orgAsyncStorage } from '@/common/services/org-async-context';
import { OrgScopeSubscriber } from './org-scope.subscriber';
import { OrgScopedEntity } from './org-scoped.entity';

// Concrete subclass for testing
class TestEntity extends OrgScopedEntity<TestEntity> {
	name: string;
}

describe('OrgScopeSubscriber', () => {
	let subscriber: OrgScopeSubscriber;

	beforeEach(() => {
		subscriber = new OrgScopeSubscriber();
	});

	describe('beforeInsert', () => {
		it('should auto-inject organizationId on OrgScopedEntity', () => {
			orgAsyncStorage.run({ organizationId: 'org-1', isSuperAdmin: false, impersonatedBy: null }, () => {
				const entity = new TestEntity({});
				const event = { entity } as any;

				subscriber.beforeInsert(event);

				expect(entity.organizationId).toBe('org-1');
			});
		});

		it('should NOT overwrite existing organizationId', () => {
			orgAsyncStorage.run({ organizationId: 'org-1', isSuperAdmin: false, impersonatedBy: null }, () => {
				const entity = new TestEntity({});
				entity.organizationId = 'org-2';
				const event = { entity } as any;

				subscriber.beforeInsert(event);

				expect(entity.organizationId).toBe('org-2');
			});
		});

		it('should NOT inject when ALS context has no organizationId', () => {
			orgAsyncStorage.run({ organizationId: null, isSuperAdmin: false, impersonatedBy: null }, () => {
				const entity = new TestEntity({});
				const event = { entity } as any;

				subscriber.beforeInsert(event);

				expect(entity.organizationId).toBeUndefined();
			});
		});

		it('should skip non-OrgScopedEntity entities', () => {
			orgAsyncStorage.run({ organizationId: 'org-1', isSuperAdmin: false, impersonatedBy: null }, () => {
				const entity = { name: 'regular entity' };
				const event = { entity } as any;

				subscriber.beforeInsert(event);

				expect((entity as any).organizationId).toBeUndefined();
			});
		});

		it('should skip when entity is null/undefined', () => {
			const event = { entity: null } as any;

			// Should not throw
			expect(() => subscriber.beforeInsert(event)).not.toThrow();
		});

		it('should work without ALS context (no active store)', () => {
			const entity = new TestEntity({});
			const event = { entity } as any;

			expect(() => subscriber.beforeInsert(event)).not.toThrow();
			expect(entity.organizationId).toBeUndefined();
		});

		it('should NOT inject for super admin context', () => {
			orgAsyncStorage.run({ organizationId: 'org-1', isSuperAdmin: true, impersonatedBy: null }, () => {
				const entity = new TestEntity({});
				const event = { entity } as any;

				subscriber.beforeInsert(event);

				expect(entity.organizationId).toBeUndefined();
			});
		});
	});
});
