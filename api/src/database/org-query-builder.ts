import { OrgContextService } from '@/common/services/org-context.service';
import { SelectQueryBuilder } from 'typeorm';

export class OrgQueryBuilder<T> {
	constructor(
		private qb: SelectQueryBuilder<T>,
		private orgContext: OrgContextService,
		private alias: string,
	) {}

	build(): SelectQueryBuilder<T> {
		if (!this.orgContext.isSuperAdmin && this.orgContext.organizationId) {
			this.qb.andWhere(`${this.alias}.organization_id = :orgId`, {
				orgId: this.orgContext.organizationId,
			});
		}
		return this.qb;
	}
}
