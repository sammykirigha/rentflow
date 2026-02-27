import { AuditAction } from '@/common/enums/audit-action.enum';
import { AuditTargetType } from '@/common/enums/audit-target-type.enum';
import { AbstractEntity } from '@/database/abstract.entity';
import { User } from '@/modules/users/entities/user.entity';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity('audit_logs')
export class AuditLog extends AbstractEntity<AuditLog> {
	@PrimaryGeneratedColumn('uuid', { name: 'audit_id' })
	auditId: string;

	@Column({
		type: 'enum',
		enum: AuditAction,
	})
	action: AuditAction;

	@Column({ name: 'performed_by', nullable: true })
	performedBy: string;

	@Column({
		type: 'enum',
		enum: AuditTargetType,
	})
	targetType: AuditTargetType;

	@Column({ name: 'target_id', nullable: true })
	targetId: string;

	@Column({ type: 'text' })
	details: string;

	@Column({ name: 'ip_address', nullable: true })
	ipAddress: string;

	@Column({ type: 'jsonb', nullable: true })
	metadata: Record<string, any>;

	// Relations
	@ManyToOne(() => User, { eager: false, nullable: true })
	@JoinColumn({ name: 'performed_by', referencedColumnName: 'userId' })
	performer: User;
}
