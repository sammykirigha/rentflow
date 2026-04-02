import { RequireSuperAdmin } from '@/common/decorators/require-super-admin.decorator';
import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SubscriptionPlan } from './entities/subscription.entity';
import { SubscriptionsService } from './subscriptions.service';

@ApiTags('Subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
	constructor(private readonly subscriptionsService: SubscriptionsService) {}

	@Get(':organizationId')
	@RequireSuperAdmin()
	async getSubscription(@Param('organizationId') organizationId: string) {
		return this.subscriptionsService.findByOrganization(organizationId);
	}

	@Patch(':organizationId/plan')
	@RequireSuperAdmin()
	async updatePlan(
		@Param('organizationId') organizationId: string,
		@Body('plan') plan: SubscriptionPlan,
	) {
		return this.subscriptionsService.updatePlan(organizationId, plan);
	}

	@Patch(':organizationId/cancel')
	@RequireSuperAdmin()
	async cancel(@Param('organizationId') organizationId: string) {
		return this.subscriptionsService.cancel(organizationId);
	}
}
