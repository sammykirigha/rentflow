import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription, SubscriptionPlan, SubscriptionStatus } from './entities/subscription.entity';
import { PLAN_LIMITS } from './constants/plan-limits';

@Injectable()
export class SubscriptionsService {
	constructor(
		@InjectRepository(Subscription)
		private readonly subscriptionRepository: Repository<Subscription>,
	) {}

	async createTrialSubscription(organizationId: string): Promise<Subscription> {
		const trialEndsAt = new Date();
		trialEndsAt.setDate(trialEndsAt.getDate() + 14); // 14-day trial

		const limits = PLAN_LIMITS[SubscriptionPlan.PRO]; // Trial gets Pro limits

		const subscription = this.subscriptionRepository.create({
			organizationId,
			plan: SubscriptionPlan.PRO,
			status: SubscriptionStatus.TRIAL,
			trialEndsAt,
			currentPeriodStart: new Date(),
			currentPeriodEnd: trialEndsAt,
			...limits,
		});

		return this.subscriptionRepository.save(subscription);
	}

	async findByOrganization(organizationId: string): Promise<Subscription | null> {
		return this.subscriptionRepository.findOne({
			where: { organizationId },
		});
	}

	async updatePlan(organizationId: string, plan: SubscriptionPlan): Promise<Subscription> {
		const subscription = await this.findByOrganization(organizationId);
		if (!subscription) {
			throw new NotFoundException('Subscription not found');
		}

		const limits = PLAN_LIMITS[plan];
		Object.assign(subscription, {
			plan,
			status: SubscriptionStatus.ACTIVE,
			...limits,
		});

		return this.subscriptionRepository.save(subscription);
	}

	async cancel(organizationId: string): Promise<Subscription> {
		const subscription = await this.findByOrganization(organizationId);
		if (!subscription) {
			throw new NotFoundException('Subscription not found');
		}

		subscription.status = SubscriptionStatus.CANCELLED;
		return this.subscriptionRepository.save(subscription);
	}

	async incrementSmsUsage(organizationId: string): Promise<boolean> {
		const result = await this.subscriptionRepository
			.createQueryBuilder()
			.update(Subscription)
			.set({ smsUsedThisPeriod: () => 'sms_used_this_period + 1' })
			.where('organization_id = :orgId', { orgId: organizationId })
			.andWhere('sms_used_this_period < sms_quota_monthly OR sms_quota_monthly = -1')
			.execute();

		return (result.affected ?? 0) > 0;
	}

	async resetMonthlySmsUsage(): Promise<void> {
		await this.subscriptionRepository
			.createQueryBuilder()
			.update(Subscription)
			.set({ smsUsedThisPeriod: 0 })
			.where('status IN (:...statuses)', {
				statuses: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL],
			})
			.execute();
	}
}
