import {
	CanActivate,
	ExecutionContext,
	ForbiddenException,
	Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { orgAsyncStorage } from '../services/org-async-context';

@Injectable()
export class OrgGuard implements CanActivate {
	constructor(private reflector: Reflector) {}

	canActivate(context: ExecutionContext): boolean {
		const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
			context.getHandler(),
			context.getClass(),
		]);
		if (isPublic) return true;

		const request = context.switchToHttp().getRequest();
		const user = request.user;

		if (!user) return true; // Let JwtAuthGuard handle unauthenticated

		// Populate AsyncLocalStorage context from the authenticated user
		const store = orgAsyncStorage.getStore();
		if (store) {
			store.organizationId = user.organizationId || null;
			store.isSuperAdmin = user.isSuperAdmin || false;
			store.impersonatedBy = user.impersonatedBy || null;
		}

		// Super admins bypass org check
		if (user.isSuperAdmin) return true;

		// All other users must have an organization context
		if (!user.organizationId) {
			throw new ForbiddenException('Organization context is required');
		}

		return true;
	}
}
