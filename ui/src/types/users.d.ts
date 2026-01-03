import { Role } from "./permissions";

export interface User {
	userId: string;
	createdAt: string;
	avatarUrl?: string;
	updatedAt: string;
	deletedAt: null;
	userId: string;
	roleId: number;
	email: string;
	firstName: string;
	lastName: string;
	phone: null;
	roleId: string;
	status: string;
	isAdminUser: boolean;
	isOnboarded: boolean;
	phoneVerified: boolean;
	emailVerified: boolean;
	emailVerificationToken: null;
	emailVerificationExpires: null;
	resetPasswordToken: null;
	resetPasswordExpires: null;
	phoneVerificationToken: null;
	phoneVerificationExpires: null;
	suspensionReason: null;
	lastLoginAt: null;
	teacherProfile: null;
	userRole: Role;
	teacherProfile?: Teacher;
}
