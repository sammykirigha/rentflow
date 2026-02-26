import { UserStatus } from '@/common/enums/user-status.enum';
import { AbstractEntity } from '@/database/abstract.entity';
import { Role } from '@/modules/permissions/entities/role.entity';
import { Tenant } from '@/modules/tenants/entities/tenant.entity';
import { Exclude } from 'class-transformer';
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity('users')
@Index(['email'], { unique: true })
export class User extends AbstractEntity<User> {
	@PrimaryGeneratedColumn('uuid', { name: 'user_id' })
	userId: string;

	@Column({ name: 'role_id', nullable: true })
	roleId: string;

	@Column({ unique: true })
	email: string;

	@Column({ nullable: true })
	@Exclude()
	password?: string;

	@Column({ nullable: true })
	firstName?: string;

	@Column({ nullable: true })
	lastName?: string;

	@Column({ nullable: true })
	phone?: string;

	@Column({ name: 'avatar_url', nullable: true })
	avatarUrl?: string;

	@Column({
		type: 'enum',
		enum: UserStatus,
		default: UserStatus.ACTIVE,
	})
	status: UserStatus;

	@Column({ name: 'phone_verified', default: false })
	phoneVerified: boolean;

	@Column({ name: 'email_verified', default: false })
	emailVerified: boolean;

	@Column({ name: 'reset_password_token', nullable: true })
	resetPasswordToken?: string;

	@Column({ name: 'reset_password_expires', nullable: true })
	resetPasswordExpires?: Date;

	@Column({ name: 'suspension_reason', nullable: true, type: 'text' })
	suspensionReason?: string;

	@Column({ name: 'last_login_at', nullable: true })
	lastLoginAt?: Date;

	@Column({ name: 'refresh_token', nullable: true })
	@Exclude()
	refreshToken?: string;

	// Relations
	@ManyToOne(() => Role, (role) => role.users, { eager: true, nullable: true })
	@JoinColumn({ name: 'role_id' })
	userRole: Role;

	@OneToOne(() => Tenant, (tenant) => tenant.user)
	tenant?: Tenant;

	get fullName(): string {
		return `${this.firstName || ''} ${this.lastName || ''}`.trim();
	}

	// Virtual getter for permissions
	get permissions(): string[] {
		if (!this.userRole?.permissions) return [];
		return this.userRole.permissions.map(p => `${p.resource}:${p.action}`);
	}
}
