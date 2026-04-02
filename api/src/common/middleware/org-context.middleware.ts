import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { orgAsyncStorage } from '../services/org-async-context';

@Injectable()
export class OrgContextMiddleware implements NestMiddleware {
	use(_req: Request, _res: Response, next: NextFunction) {
		// Initialize the ALS context with null values.
		// The OrgGuard (which runs after JWT auth) will populate organizationId.
		orgAsyncStorage.run(
			{ organizationId: null, isSuperAdmin: false, impersonatedBy: null },
			() => {
				next();
			},
		);
	}
}
