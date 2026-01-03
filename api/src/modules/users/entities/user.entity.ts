import { UserStatus } from '@/common/enums/user-status.enum';
import { AbstractEntity } from '@/database/abstract.entity';
import { Role } from '@/modules/permissions/entities/role.entity';
import { Exclude } from 'class-transformer';
import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity('users')
@Index(['email'], { unique: true })
export class User extends AbstractEntity<User> {
	@PrimaryGeneratedColumn('uuid', { name: 'user_id' })
	userId: string;

	@Column({ name: 'role_id', nullable: true })
	roleId: string;

	@Column({ unique: true })
	email: string;

	@Column()
	@Exclude()
	password: string;

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

	@Column({ name: "phone_verification_token", nullable: true })
	phoneVerificationToken?: string;

	@Column({ name: 'phone_verification_expires', nullable: true })
	phoneVerificationExpires?: Date;

	@Column({ name: 'email_verified', default: false })
	emailVerified: boolean;

	@Column({ name: 'email_verification_token', nullable: true })
	emailVerificationToken?: string;

	@Column({ name: 'email_verification_expires', nullable: true })
	emailVerificationExpires?: Date;

	@Column({ name: 'reset_password_token', nullable: true })
	resetPasswordToken?: string;

	@Column({ name: 'reset_password_expires', nullable: true })
	resetPasswordExpires?: Date;

	@Column({ name: 'suspension_reason', nullable: true, type: 'text' })
	suspensionReason?: string;

	@Column({ name: 'is_onboarded', default: false })
	isOnboarded: boolean;

	@Column({ name: 'last_login_at', nullable: true })
	lastLoginAt?: Date;

	@Column({ name: 'refresh_token', nullable: true })
	@Exclude()
	refreshToken?: string;

	// Relation
	@ManyToOne(() => Role, (role) => role.users, { eager: true, nullable: true })
	@JoinColumn({ name: 'role_id' })
	userRole: Role;

	get fullName(): string {
		return `${this.firstName} ${this.lastName}`.trim();
	}

	// Virtual getter for permissions
	get permissions(): string[] {
		if (!this.userRole?.permissions) return [];
		return this.userRole.permissions.map(p => `${p.resource}:${p.action}`);
	}
}