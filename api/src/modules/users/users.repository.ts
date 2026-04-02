import { AbstractRepository } from '@/database/abstract.repository';
import { OrgContextService } from '@/common/services/org-context.service';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, FindManyOptions, FindOneOptions, FindOptionsWhere, Repository } from 'typeorm';
import { User } from './entities/user.entity';

/**
 * UsersRepository with org-scoping.
 * User entity has nullable organizationId (super-admins have NULL).
 * We filter by org for non-super-admin contexts.
 */
@Injectable()
export class UsersRepository extends AbstractRepository<User> {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly orgContext: OrgContextService,
  ) {
    super(userRepository);
  }

  private injectOrgFilter<O extends FindManyOptions<User> | FindOneOptions<User>>(options?: O): O {
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

  async findAll(options?: FindManyOptions<User>): Promise<User[]> {
    return super.findAll(this.injectOrgFilter(options));
  }

  async findAndCount(where?: FindManyOptions<User>): Promise<[User[], number]> {
    return super.findAndCount(this.injectOrgFilter(where));
  }

  createQueryBuilder(alias: string) {
    const qb = this.userRepository.createQueryBuilder(alias);
    if (!this.orgContext.isSuperAdmin && this.orgContext.organizationId) {
      qb.andWhere(`${alias}.organization_id = :orgId`, {
        orgId: this.orgContext.organizationId,
      });
    }
    return qb;
  }
}
