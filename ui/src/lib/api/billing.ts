import {
	AiUsageBreakdown,
	CreditBalance,
	CreditStatistics,
	CreditTransaction,
	CreditTransactionType,
	CreditUsageSummary,
	DailyUsage,
} from '@/types/billing';
import api from '.';

// ==================== USER CREDIT ENDPOINTS ====================

/**
 * Get current user's credit balance
 */
export async function getCreditBalance(): Promise<CreditBalance> {
	const response = await api.get('/billing/credits/balance');
	return response.data.data;
}

/**
 * Get current user's transaction history
 */
export async function getTransactionHistory(params?: {
	limit?: number;
	offset?: number;
	transactionType?: CreditTransactionType;
}): Promise<{
	transactions: CreditTransaction[];
	total: number;
	limit: number;
	offset: number;
}> {
	const response = await api.get('/billing/credits/transactions', { params });
	return {
		transactions: response.data.data?.data,
		...response.data?.data?.meta,
	};
}

/**
 * Get usage summary for a date range
 */
export async function getUsageSummary(
	startDate: Date,
	endDate: Date
): Promise<CreditUsageSummary> {
	const response = await api.get('/billing/credits/usage-summary', {
		params: {
			startDate: startDate.toISOString(),
			endDate: endDate.toISOString(),
		},
	});
	return response.data.data;
}

/**
 * Get AI usage breakdown
 */
export async function getAiUsageBreakdown(
	startDate?: Date,
	endDate?: Date
): Promise<AiUsageBreakdown> {
	const params: Record<string, string> = {};
	if (startDate) params.startDate = startDate.toISOString();
	if (endDate) params.endDate = endDate.toISOString();

	const response = await api.get('/billing/credits/ai-usage', { params });
	return response.data.data;
}

/**
 * Get daily usage for charts
 */
export async function getDailyUsage(days?: number): Promise<DailyUsage[]> {
	const response = await api.get('/billing/credits/daily-usage', {
		params: { days },
	});
	return response.data.data;
}

/**
 * Update low credit threshold
 */
export async function updateCreditThreshold(threshold: number): Promise<void> {
	await api.patch('/billing/credits/threshold', { threshold });
}

// ==================== ADMIN ENDPOINTS ====================

/**
 * Adjust user credits - Admin only
 */
export async function adjustUserCredits(
	userId: number,
	amount: number,
	reason: string
): Promise<CreditTransaction> {
	const response = await api.post('/billing/admin/credits/adjust', {
		userId,
		amount,
		reason,
	});
	return response.data.data;
}

/**
 * Get user's credit balance - Admin only
 */
export async function getUserCredits(userId: number): Promise<CreditBalance> {
	const response = await api.get(`/billing/admin/users/${userId}/credits`);
	return response.data.data;
}

/**
 * Get user's transaction history - Admin only
 */
export async function getUserTransactions(
	userId: number,
	params?: {
		limit?: number;
		offset?: number;
		transactionType?: CreditTransactionType;
	}
): Promise<{
	transactions: CreditTransaction[];
	total: number;
}> {
	const response = await api.get(`/billing/admin/users/${userId}/transactions`, {
		params,
	});
	return {
		transactions: response.data.data,
		...response.data.meta,
	};
}

/**
 * Get billing statistics - Admin only
 */
export async function getBillingStatistics(): Promise<CreditStatistics> {
	const response = await api.get('/billing/admin/statistics');
	return response.data.data;
}
