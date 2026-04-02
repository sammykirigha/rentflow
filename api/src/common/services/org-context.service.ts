import { Injectable } from '@nestjs/common';
import { orgAsyncStorage } from './org-async-context';

@Injectable()
export class OrgContextService {
	get organizationId(): string | null {
		return orgAsyncStorage.getStore()?.organizationId ?? null;
	}

	get isSuperAdmin(): boolean {
		return orgAsyncStorage.getStore()?.isSuperAdmin ?? false;
	}

	get impersonatedBy(): string | null {
		return orgAsyncStorage.getStore()?.impersonatedBy ?? null;
	}

	requireOrganizationId(): string {
		const orgId = this.organizationId;
		if (!orgId) {
			throw new Error('Organization context is required but not set');
		}
		return orgId;
	}
}
