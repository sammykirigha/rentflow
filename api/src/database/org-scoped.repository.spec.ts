import { OrgContextService } from '@/common/services/org-context.service';
import { orgAsyncStorage } from '@/common/services/org-async-context';
import { OrgScopedRepository } from './org-scoped.repository';

interface MockEntity {
	id: string;
	organizationId?: string;
	name: string;
}

class TestRepository extends OrgScopedRepository<MockEntity> {}

function createMockTypeOrmRepo() {
	return {
		create: jest.fn().mockImplementation((data) => data),
		save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
		findOne: jest.fn().mockResolvedValue(null),
		find: jest.fn().mockResolvedValue([]),
		findAndCount: jest.fn().mockResolvedValue([[], 0]),
		update: jest.fn().mockResolvedValue({ affected: 1 }),
		delete: jest.fn().mockResolvedValue({ affected: 1 }),
		createQueryBuilder: jest.fn().mockReturnValue({
			andWhere: jest.fn().mockReturnThis(),
			where: jest.fn().mockReturnThis(),
			getMany: jest.fn().mockResolvedValue([]),
		}),
	};
}

/** Helper to run test body inside an ALS context */
function withOrg(orgId: string | null, isSuperAdmin: boolean, fn: () => Promise<void> | void) {
	return () => orgAsyncStorage.run(
		{ organizationId: orgId, isSuperAdmin, impersonatedBy: null },
		fn,
	);
}

describe('OrgScopedRepository', () => {
	let repository: TestRepository;
	let mockRepo: ReturnType<typeof createMockTypeOrmRepo>;
	let orgContext: OrgContextService;

	beforeEach(() => {
		mockRepo = createMockTypeOrmRepo();
		orgContext = new OrgContextService();
		repository = new TestRepository(mockRepo as any, orgContext);
	});

	describe('findOne', () => {
		it('should inject organizationId into where clause', withOrg('org-1', false, async () => {
			await repository.findOne({ where: { id: 'entity-1' } as any });

			expect(mockRepo.findOne).toHaveBeenCalledWith({
				where: { id: 'entity-1', organizationId: 'org-1' },
			});
		}));

		it('should create where clause with orgId when no where exists', withOrg('org-1', false, async () => {
			await repository.findOne({} as any);

			expect(mockRepo.findOne).toHaveBeenCalledWith({
				where: { organizationId: 'org-1' },
			});
		}));

		it('should inject orgId into array where clauses', withOrg('org-1', false, async () => {
			await repository.findOne({
				where: [
					{ name: 'test1' } as any,
					{ name: 'test2' } as any,
				],
			});

			expect(mockRepo.findOne).toHaveBeenCalledWith({
				where: [
					{ name: 'test1', organizationId: 'org-1' },
					{ name: 'test2', organizationId: 'org-1' },
				],
			});
		}));

		it('should NOT inject orgId when user is super admin', withOrg('org-1', true, async () => {
			await repository.findOne({ where: { id: 'entity-1' } as any });

			expect(mockRepo.findOne).toHaveBeenCalledWith({
				where: { id: 'entity-1' },
			});
		}));

		it('should NOT inject orgId when organizationId is null', withOrg(null, false, async () => {
			await repository.findOne({ where: { id: 'entity-1' } as any });

			expect(mockRepo.findOne).toHaveBeenCalledWith({
				where: { id: 'entity-1' },
			});
		}));
	});

	describe('findAll', () => {
		it('should inject organizationId into find options', withOrg('org-1', false, async () => {
			await repository.findAll({ where: { name: 'test' } as any });

			expect(mockRepo.find).toHaveBeenCalledWith({
				where: { name: 'test', organizationId: 'org-1' },
			});
		}));

		it('should work with no options provided', withOrg('org-1', false, async () => {
			await repository.findAll();

			expect(mockRepo.find).toHaveBeenCalledWith({
				where: { organizationId: 'org-1' },
			});
		}));

		it('should bypass filter for super admin', withOrg('org-1', true, async () => {
			await repository.findAll({ where: { name: 'test' } as any });

			expect(mockRepo.find).toHaveBeenCalledWith({
				where: { name: 'test' },
			});
		}));
	});

	describe('findAndCount', () => {
		it('should inject organizationId', withOrg('org-1', false, async () => {
			await repository.findAndCount({ where: { name: 'test' } as any });

			expect(mockRepo.findAndCount).toHaveBeenCalledWith({
				where: { name: 'test', organizationId: 'org-1' },
			});
		}));

		it('should bypass filter for super admin', withOrg('org-1', true, async () => {
			await repository.findAndCount({ where: { name: 'test' } as any });

			expect(mockRepo.findAndCount).toHaveBeenCalledWith({
				where: { name: 'test' },
			});
		}));
	});

	describe('create', () => {
		it('should auto-inject organizationId on new entities', withOrg('org-1', false, async () => {
			await repository.create({ name: 'new entity' } as any);

			expect(mockRepo.create).toHaveBeenCalledWith(
				expect.objectContaining({ name: 'new entity', organizationId: 'org-1' }),
			);
		}));

		it('should NOT overwrite existing organizationId', withOrg('org-1', false, async () => {
			await repository.create({ name: 'new entity', organizationId: 'org-2' } as any);

			expect(mockRepo.create).toHaveBeenCalledWith(
				expect.objectContaining({ organizationId: 'org-2' }),
			);
		}));

		it('should NOT inject orgId when super admin', withOrg('org-1', true, async () => {
			await repository.create({ name: 'admin entity' } as any);

			expect(mockRepo.create).toHaveBeenCalledWith(
				expect.objectContaining({ name: 'admin entity' }),
			);
			// Should not have organizationId added
			const createArg = mockRepo.create.mock.calls[0][0];
			expect(createArg.organizationId).toBeUndefined();
		}));
	});

	describe('update', () => {
		it('should inject organizationId into criteria', withOrg('org-1', false, async () => {
			await repository.update(
				{ id: 'entity-1' } as any,
				{ name: 'updated' } as any,
			);

			expect(mockRepo.update).toHaveBeenCalledWith(
				{ id: 'entity-1', organizationId: 'org-1' },
				{ name: 'updated' },
			);
		}));

		it('should bypass for super admin', withOrg('org-1', true, async () => {
			await repository.update(
				{ id: 'entity-1' } as any,
				{ name: 'updated' } as any,
			);

			expect(mockRepo.update).toHaveBeenCalledWith(
				{ id: 'entity-1' },
				{ name: 'updated' },
			);
		}));
	});

	describe('deleteByCriteria', () => {
		it('should inject organizationId into criteria', withOrg('org-1', false, async () => {
			await repository.deleteByCriteria({ id: 'entity-1' } as any);

			expect(mockRepo.delete).toHaveBeenCalledWith({
				id: 'entity-1',
				organizationId: 'org-1',
			});
		}));

		it('should bypass for super admin', withOrg('org-1', true, async () => {
			await repository.deleteByCriteria({ id: 'entity-1' } as any);

			expect(mockRepo.delete).toHaveBeenCalledWith({ id: 'entity-1' });
		}));
	});

	describe('createQueryBuilder', () => {
		it('should add org filter to query builder', withOrg('org-1', false, () => {
			const qb = repository.createQueryBuilder('entity');

			expect(mockRepo.createQueryBuilder).toHaveBeenCalledWith('entity');
			expect(qb.andWhere).toHaveBeenCalledWith(
				'entity.organization_id = :orgId',
				{ orgId: 'org-1' },
			);
		}));

		it('should NOT add org filter for super admin', withOrg('org-1', true, () => {
			const qb = repository.createQueryBuilder('entity');

			expect(mockRepo.createQueryBuilder).toHaveBeenCalledWith('entity');
			expect(qb.andWhere).not.toHaveBeenCalled();
		}));
	});
});
