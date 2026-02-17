import { AbstractEntity } from '@/database/abstract.entity';
import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Role } from './role.entity';

export enum PermissionResource {
	USERS = 'users',
	PROPERTIES = 'properties',
	UNITS = 'units',
	TENANTS = 'tenants',
	INVOICES = 'invoices',
	PAYMENTS = 'payments',
	WALLET = 'wallet',
	EXPENSES = 'expenses',
	VENDORS = 'vendors',
	MAINTENANCE = 'maintenance',
	COMMUNICATIONS = 'communications',
	REPORTS = 'reports',
	SETTINGS = 'settings',
}

export enum PermissionAction {
	CREATE = 'create',
	READ = 'read',
	UPDATE = 'update',
	DELETE = 'delete',
	EXPORT = 'export',
}

@Entity('permissions')
export class Permission extends AbstractEntity<Permission> {
	@PrimaryGeneratedColumn('uuid', { name: 'permission_id' })
	permissionId: string;

	@Column({
		type: 'enum',
		enum: PermissionResource,
	})
	resource: PermissionResource;

	@Column({
		type: 'enum',
		enum: PermissionAction,
	})
	action: PermissionAction;

	@Column()
	name: string;

	@Column({ type: 'text', nullable: true })
	description?: string;

	@ManyToMany(() => Role, (role) => role.permissions)
	roles: Role[];
}
