import {
	CallHandler,
	ExecutionContext,
	ForbiddenException,
	Injectable,
	NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * Global interceptor that blocks all requests (except auth endpoints)
 * when the authenticated user has mustChangePassword = true.
 */
@Injectable()
export class PasswordChangeInterceptor implements NestInterceptor {
	private readonly allowedPaths = [
		'/auth/login',
		'/auth/change-password',
		'/auth/me',
		'/auth/refresh',
		'/auth/logout',
	];

	intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		const request = context.switchToHttp().getRequest();
		const user = request.user;

		if (!user || !user.mustChangePassword) {
			return next.handle();
		}

		const path = request.route?.path || request.url;
		const normalizedPath = path.replace(/^\/api\/v1|^\/api/, '');

		if (this.allowedPaths.some((allowed) => normalizedPath.startsWith(allowed))) {
			return next.handle();
		}

		throw new ForbiddenException({
			statusCode: 403,
			code: 'PASSWORD_CHANGE_REQUIRED',
			message: 'You must change your password before accessing other resources.',
		});
	}
}
