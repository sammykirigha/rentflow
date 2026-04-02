import {
	CallHandler,
	ExecutionContext,
	ForbiddenException,
	Injectable,
	NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { orgAsyncStorage } from '../services/org-async-context';

/**
 * Global interceptor that populates the AsyncLocalStorage org context
 * from the authenticated user (req.user).
 *
 * Must be an interceptor (not a guard) because interceptors run AFTER
 * all guards — so JwtAuthGuard has already set req.user by the time
 * this executes.
 */
@Injectable()
export class OrgContextInterceptor implements NestInterceptor {
	constructor(private reflector: Reflector) {}

	intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
			context.getHandler(),
			context.getClass(),
		]);
		if (isPublic) return next.handle();

		const request = context.switchToHttp().getRequest();
		const user = request.user;

		if (!user) return next.handle();

		// Populate AsyncLocalStorage context from the authenticated user
		const store = orgAsyncStorage.getStore();
		if (store) {
			store.organizationId = user.organizationId || null;
			store.isSuperAdmin = user.isSuperAdmin || false;
			store.impersonatedBy = user.impersonatedBy || null;
		}

		// Super admins bypass org check
		if (user.isSuperAdmin) return next.handle();

		// All other users must have an organization context
		if (!user.organizationId) {
			throw new ForbiddenException('Organization context is required');
		}

		return next.handle();
	}
}
