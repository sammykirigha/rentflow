import { Subscription } from '@/modules/subscriptions/entities/subscription.entity';
import {
	CanActivate,
	ExecutionContext,
	ForbiddenException,
	Injectable,
	SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

export const SUBSCRIPTION_LIMIT_KEY = 'subscriptionLimit';

export type SubscriptionLimitResource = 'properties' | 'units' | 'sms' | 'managers';

export const CheckSubscriptionLimit = (resource: SubscriptionLimitResource) =>
	SetMetadata(SUBSCRIPTION_LIMIT_KEY, resource);

@Injectable()
export class SubscriptionLimitGuard implements CanActivate {
	constructor(
		private reflector: Reflector,
		@InjectRepository(Subscription)
		private readonly subscriptionRepository: Repository<Subscription>,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const resource = this.reflector.get<SubscriptionLimitResource>(
			SUBSCRIPTION_LIMIT_KEY,
			context.getHandler(),
		);

		if (!resource) return true;

		const request = context.switchToHttp().getRequest();
		const user = request.user;

		if (!user || user.isSuperAdmin) return true;
		if (!user.organizationId) return true;

		const subscription = await this.subscriptionRepository.findOne({
			where: { organizationId: user.organizationId },
		});

		if (!subscription) {
			throw new ForbiddenException('No active subscription found');
		}

		switch (resource) {
			case 'sms': {
				if (
					subscription.smsQuotaMonthly !== -1 &&
					subscription.smsUsedThisPeriod >= subscription.smsQuotaMonthly
				) {
					throw new ForbiddenException('SMS quota exceeded for current billing period');
				}
				break;
			}
			// properties, units, managers limits are checked at service level
			// because they require counting existing records
		}

		return true;
	}
}
