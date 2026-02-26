import { Role } from "./permissions";

export interface User {
	userId: string;
	createdAt: string;
	avatarUrl?: string;
	updatedAt: string;
	deletedAt?: string | null;
	roleId: string;
	email: string;
	firstName: string;
	lastName: string;
	phone?: string | null;
	status: string;
	phoneVerified: boolean;
	emailVerified: boolean;
	resetPasswordToken?: string | null;
	resetPasswordExpires?: string | null;
	suspensionReason?: string | null;
	lastLoginAt?: string | null;
	userRole: Role;
	tenant?: {
		tenantId: string;
		unitId?: string;
		walletBalance: number;
		status: string;
	};
}
