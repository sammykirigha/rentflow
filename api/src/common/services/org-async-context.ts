import { AsyncLocalStorage } from 'async_hooks';

export interface OrgAsyncContext {
	organizationId: string | null;
	isSuperAdmin: boolean;
	impersonatedBy: string | null;
}

export const orgAsyncStorage = new AsyncLocalStorage<OrgAsyncContext>();
