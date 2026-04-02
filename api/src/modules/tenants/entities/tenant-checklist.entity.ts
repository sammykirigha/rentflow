import { OrgScopedEntity } from '@/database/org-scoped.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Tenant } from './tenant.entity';

export enum ChecklistType {
  ONBOARDING = 'onboarding',
  EXIT = 'exit',
}

export interface ChecklistItem {
  label: string;
  completed: boolean;
  completedAt?: string;
  completedBy?: string;
}

@Entity('tenant_checklists')
@Index(['tenantId', 'type'])
export class TenantChecklist extends OrgScopedEntity<TenantChecklist> {
  @PrimaryGeneratedColumn('uuid', { name: 'checklist_id' })
  checklistId: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ type: 'enum', enum: ChecklistType })
  type: ChecklistType;

  @Column({ type: 'jsonb', default: '[]' })
  items: ChecklistItem[];

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt?: Date;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;
}
