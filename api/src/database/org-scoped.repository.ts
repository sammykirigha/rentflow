import { OrgContextService } from '@/common/services/org-context.service';
import { DeepPartial, FindManyOptions, FindOneOptions, FindOptionsWhere, Repository, SelectQueryBuilder } from 'typeorm';
import { AbstractRepository } from './abstract.repository';

export abstract class OrgScopedRepository<T extends { organizationId?: string }> extends AbstractRepository<T> {
	constructor(
		protected readonly repository: Repository<T>,
		protected readonly orgContext: OrgContextService,
	) {
		super(repository);
	}

	private injectOrgFilter<O extends FindManyOptions<T> | FindOneOptions<T>>(options?: O): O {
		if (this.orgContext.isSuperAdmin) {
			return (options || {}) as O;
		}

		const orgId = this.orgContext.organizationId;
		if (!orgId) {
			return (options || {}) as O;
		}

		const opts = (options || {}) as any;

		if (!opts.where) {
			opts.where = { organizationId: orgId } as any;
		} else if (Array.isArray(opts.where)) {
			opts.where = opts.where.map((w: any) => ({
				...w,
				organizationId: orgId,
			}));
		} else {
			opts.where = {
				...opts.where,
				organizationId: orgId,
			};
		}

		return opts as O;
	}

	async create(data: DeepPartial<T>): Promise<T> {
		if (!this.orgContext.isSuperAdmin && this.orgContext.organizationId) {
			(data as any).organizationId = (data as any).organizationId || this.orgContext.organizationId;
		}
		return super.create(data);
	}

	async findOne(options: FindOneOptions<T>): Promise<T | null> {
		return super.findOne(this.injectOrgFilter(options));
	}

	async findAll(options?: FindManyOptions<T>): Promise<T[]> {
		return super.findAll(this.injectOrgFilter(options));
	}

	async findAndCount(where?: FindManyOptions<T>): Promise<[T[], number]> {
		return super.findAndCount(this.injectOrgFilter(where));
	}

	async update(criteria: FindOptionsWhere<T>, update: DeepPartial<T>): Promise<T | null> {
		if (!this.orgContext.isSuperAdmin && this.orgContext.organizationId) {
			criteria = { ...criteria, organizationId: this.orgContext.organizationId } as any;
		}
		return super.update(criteria, update);
	}

	async deleteByCriteria(criteria: FindOptionsWhere<T>): Promise<void> {
		if (!this.orgContext.isSuperAdmin && this.orgContext.organizationId) {
			criteria = { ...criteria, organizationId: this.orgContext.organizationId } as any;
		}
		return super.deleteByCriteria(criteria);
	}

	createQueryBuilder(alias: string): SelectQueryBuilder<T> {
		const qb = this.repository.createQueryBuilder(alias);
		if (!this.orgContext.isSuperAdmin && this.orgContext.organizationId) {
			qb.andWhere(`${alias}.organization_id = :orgId`, {
				orgId: this.orgContext.organizationId,
			});
		}
		return qb;
	}
}
