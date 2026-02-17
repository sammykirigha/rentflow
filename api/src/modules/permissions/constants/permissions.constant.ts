import { UserRole } from '@/common/enums/user-role.enum';
import { PermissionAction, PermissionResource } from '../entities/permission.entity';

export interface PermissionDefinition {
	resource: PermissionResource;
	action: PermissionAction;
	name: string;
	description: string;
}

export const SYSTEM_PERMISSIONS: PermissionDefinition[] = [
	// User Management
	{ resource: PermissionResource.USERS, action: PermissionAction.READ, name: 'View Users', description: 'View list of all users' },
	{ resource: PermissionResource.USERS, action: PermissionAction.CREATE, name: 'Create Users', description: 'Create new user accounts' },
	{ resource: PermissionResource.USERS, action: PermissionAction.UPDATE, name: 'Update Users', description: 'Update user information and status' },
	{ resource: PermissionResource.USERS, action: PermissionAction.DELETE, name: 'Delete Users', description: 'Delete user accounts' },

	// Properties
	{ resource: PermissionResource.PROPERTIES, action: PermissionAction.READ, name: 'View Properties', description: 'View property listings' },
	{ resource: PermissionResource.PROPERTIES, action: PermissionAction.CREATE, name: 'Create Properties', description: 'Add new properties' },
	{ resource: PermissionResource.PROPERTIES, action: PermissionAction.UPDATE, name: 'Update Properties', description: 'Update property details' },
	{ resource: PermissionResource.PROPERTIES, action: PermissionAction.DELETE, name: 'Delete Properties', description: 'Remove properties' },

	// Units
	{ resource: PermissionResource.UNITS, action: PermissionAction.READ, name: 'View Units', description: 'View unit listings' },
	{ resource: PermissionResource.UNITS, action: PermissionAction.CREATE, name: 'Create Units', description: 'Add new units' },
	{ resource: PermissionResource.UNITS, action: PermissionAction.UPDATE, name: 'Update Units', description: 'Update unit details' },

	// Tenants
	{ resource: PermissionResource.TENANTS, action: PermissionAction.READ, name: 'View Tenants', description: 'View tenant list' },
	{ resource: PermissionResource.TENANTS, action: PermissionAction.CREATE, name: 'Create Tenants', description: 'Register new tenants' },
	{ resource: PermissionResource.TENANTS, action: PermissionAction.UPDATE, name: 'Update Tenants', description: 'Update tenant information' },
	{ resource: PermissionResource.TENANTS, action: PermissionAction.DELETE, name: 'Delete Tenants', description: 'Remove tenants' },

	// Invoices
	{ resource: PermissionResource.INVOICES, action: PermissionAction.READ, name: 'View Invoices', description: 'View invoices' },
	{ resource: PermissionResource.INVOICES, action: PermissionAction.CREATE, name: 'Create Invoices', description: 'Generate invoices' },
	{ resource: PermissionResource.INVOICES, action: PermissionAction.UPDATE, name: 'Update Invoices', description: 'Modify invoices' },
	{ resource: PermissionResource.INVOICES, action: PermissionAction.EXPORT, name: 'Export Invoices', description: 'Export invoices to PDF/CSV' },

	// Payments
	{ resource: PermissionResource.PAYMENTS, action: PermissionAction.READ, name: 'View Payments', description: 'View payment history' },
	{ resource: PermissionResource.PAYMENTS, action: PermissionAction.CREATE, name: 'Record Payments', description: 'Record manual payments' },

	// Wallet
	{ resource: PermissionResource.WALLET, action: PermissionAction.READ, name: 'View Wallet', description: 'View wallet transactions' },
	{ resource: PermissionResource.WALLET, action: PermissionAction.UPDATE, name: 'Manage Wallet', description: 'Manage wallet operations (refunds)' },

	// Expenses
	{ resource: PermissionResource.EXPENSES, action: PermissionAction.READ, name: 'View Expenses', description: 'View expense records' },
	{ resource: PermissionResource.EXPENSES, action: PermissionAction.CREATE, name: 'Create Expenses', description: 'Log new expenses' },
	{ resource: PermissionResource.EXPENSES, action: PermissionAction.UPDATE, name: 'Update Expenses', description: 'Update expense status' },
	{ resource: PermissionResource.EXPENSES, action: PermissionAction.DELETE, name: 'Delete Expenses', description: 'Remove expenses' },

	// Vendors
	{ resource: PermissionResource.VENDORS, action: PermissionAction.READ, name: 'View Vendors', description: 'View vendor list' },
	{ resource: PermissionResource.VENDORS, action: PermissionAction.CREATE, name: 'Create Vendors', description: 'Add new vendors' },
	{ resource: PermissionResource.VENDORS, action: PermissionAction.UPDATE, name: 'Update Vendors', description: 'Update vendor details' },

	// Maintenance
	{ resource: PermissionResource.MAINTENANCE, action: PermissionAction.READ, name: 'View Maintenance', description: 'View maintenance requests' },
	{ resource: PermissionResource.MAINTENANCE, action: PermissionAction.CREATE, name: 'Create Maintenance', description: 'Submit maintenance requests' },
	{ resource: PermissionResource.MAINTENANCE, action: PermissionAction.UPDATE, name: 'Update Maintenance', description: 'Update request status' },

	// Communications
	{ resource: PermissionResource.COMMUNICATIONS, action: PermissionAction.READ, name: 'View Communications', description: 'View sent messages' },
	{ resource: PermissionResource.COMMUNICATIONS, action: PermissionAction.CREATE, name: 'Send Communications', description: 'Send SMS/email notifications' },

	// Reports
	{ resource: PermissionResource.REPORTS, action: PermissionAction.READ, name: 'View Reports', description: 'View dashboard analytics' },
	{ resource: PermissionResource.REPORTS, action: PermissionAction.EXPORT, name: 'Export Reports', description: 'Export reports' },

	// Settings
	{ resource: PermissionResource.SETTINGS, action: PermissionAction.READ, name: 'View Settings', description: 'View system settings' },
	{ resource: PermissionResource.SETTINGS, action: PermissionAction.UPDATE, name: 'Update Settings', description: 'Modify system settings' },
];

// Landlord has all permissions
export const LANDLORD_PERMISSIONS = SYSTEM_PERMISSIONS.map(
	(p) => `${p.resource}:${p.action}`,
);

// Manager permissions (CRUD tenants, invoices, expenses; no property/settings management)
export const MANAGER_PERMISSIONS = [
	`${PermissionResource.USERS}:${PermissionAction.READ}`,
	`${PermissionResource.PROPERTIES}:${PermissionAction.READ}`,
	`${PermissionResource.UNITS}:${PermissionAction.READ}`,
	`${PermissionResource.UNITS}:${PermissionAction.UPDATE}`,
	`${PermissionResource.TENANTS}:${PermissionAction.READ}`,
	`${PermissionResource.TENANTS}:${PermissionAction.CREATE}`,
	`${PermissionResource.TENANTS}:${PermissionAction.UPDATE}`,
	`${PermissionResource.INVOICES}:${PermissionAction.READ}`,
	`${PermissionResource.INVOICES}:${PermissionAction.CREATE}`,
	`${PermissionResource.INVOICES}:${PermissionAction.UPDATE}`,
	`${PermissionResource.INVOICES}:${PermissionAction.EXPORT}`,
	`${PermissionResource.PAYMENTS}:${PermissionAction.READ}`,
	`${PermissionResource.PAYMENTS}:${PermissionAction.CREATE}`,
	`${PermissionResource.WALLET}:${PermissionAction.READ}`,
	`${PermissionResource.EXPENSES}:${PermissionAction.READ}`,
	`${PermissionResource.EXPENSES}:${PermissionAction.CREATE}`,
	`${PermissionResource.EXPENSES}:${PermissionAction.UPDATE}`,
	`${PermissionResource.VENDORS}:${PermissionAction.READ}`,
	`${PermissionResource.VENDORS}:${PermissionAction.CREATE}`,
	`${PermissionResource.VENDORS}:${PermissionAction.UPDATE}`,
	`${PermissionResource.MAINTENANCE}:${PermissionAction.READ}`,
	`${PermissionResource.MAINTENANCE}:${PermissionAction.UPDATE}`,
	`${PermissionResource.COMMUNICATIONS}:${PermissionAction.READ}`,
	`${PermissionResource.COMMUNICATIONS}:${PermissionAction.CREATE}`,
	`${PermissionResource.REPORTS}:${PermissionAction.READ}`,
];

// Role name mappings
export const ROLE_NAMES = {
	LANDLORD: UserRole.LANDLORD,
	MANAGER: UserRole.MANAGER,
};
