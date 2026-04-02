import { orgAsyncStorage } from '@/common/services/org-async-context';
import {
	EntitySubscriberInterface,
	EventSubscriber,
	InsertEvent,
} from 'typeorm';
import { OrgScopedEntity } from './org-scoped.entity';

@EventSubscriber()
export class OrgScopeSubscriber implements EntitySubscriberInterface {
	beforeInsert(event: InsertEvent<any>): void {
		if (!event.entity) return;

		// Auto-inject organizationId on org-scoped entities that don't already have one
		if (
			event.entity instanceof OrgScopedEntity &&
			!event.entity.organizationId
		) {
			const store = orgAsyncStorage.getStore();
			if (store?.organizationId && !store.isSuperAdmin) {
				event.entity.organizationId = store.organizationId;
			}
		}
	}
}
