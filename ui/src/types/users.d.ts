import { Role } from "./permissions";

export interface User {
	userId: string;
	createdAt: string;
	avatarUrl?: string;
	updatedAt: string;
	deletedAt?: string | null;
	userId: string;
	roleId: number;
	email: string;
	firstName: string;
	lastName: string;
	phone?: string | null;
	roleId: string;
	status: string;
	isAdminUser: boolean;
	isOnboarded: boolean;
	phoneVerified: boolean;
	emailVerified: boolean;
	emailVerificationToken?: string | null;
	emailVerificationExpires?: string | null;
	resetPasswordToken?: string | null;
	resetPasswordExpires?: string | null;
	phoneVerificationToken?: string | null;
	phoneVerificationExpires?: string | null;
	suspensionReason?: string | null;
	lastLoginAt?: string | null;
	teacherProfile?: string | null;
	userRole: Role;
	teacherProfile?: Teacher;
	// OAuth fields
	googleId?: string | null;
	authProvider?: string; // 'local' | 'google'
}
