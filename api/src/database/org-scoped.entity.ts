import { Organization } from '@/modules/organizations/entities/organization.entity';
import { Column, Index, JoinColumn, ManyToOne } from 'typeorm';
import { AbstractEntity } from './abstract.entity';

export class OrgScopedEntity<T> extends AbstractEntity<T> {
	@Column({ name: 'organization_id', type: 'uuid' })
	@Index()
	organizationId: string;

	@ManyToOne(() => Organization, { eager: false })
	@JoinColumn({ name: 'organization_id' })
	organization: Organization;
}
