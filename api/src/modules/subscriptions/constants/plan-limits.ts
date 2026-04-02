import { SubscriptionPlan } from '../entities/subscription.entity';

export interface PlanLimits {
	maxProperties: number;
	maxUnits: number;
	smsQuotaMonthly: number;
	maxManagerUsers: number;
	hasPdfExport: boolean;
	hasBulkMessaging: boolean;
	hasApiAccess: boolean;
}

// -1 means unlimited
export const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
	[SubscriptionPlan.BASIC]: {
		maxProperties: 3,
		maxUnits: 50,
		smsQuotaMonthly: 100,
		maxManagerUsers: 1,
		hasPdfExport: false,
		hasBulkMessaging: false,
		hasApiAccess: false,
	},
	[SubscriptionPlan.PRO]: {
		maxProperties: 10,
		maxUnits: 200,
		smsQuotaMonthly: 500,
		maxManagerUsers: 5,
		hasPdfExport: true,
		hasBulkMessaging: true,
		hasApiAccess: false,
	},
	[SubscriptionPlan.ENTERPRISE]: {
		maxProperties: -1,
		maxUnits: -1,
		smsQuotaMonthly: -1,
		maxManagerUsers: -1,
		hasPdfExport: true,
		hasBulkMessaging: true,
		hasApiAccess: true,
	},
};
