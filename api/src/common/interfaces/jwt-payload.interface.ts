
export interface JwtPayload {
	sub: string;
	email: string;
	role: string;
	roleName?: string;
	organizationId?: string;
	isSuperAdmin?: boolean;
	impersonatedBy?: string;
	mustChangePassword?: boolean;
	iat?: number;
	exp?: number;
	isAdminUser?: boolean;
}