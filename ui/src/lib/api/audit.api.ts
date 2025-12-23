import api from './index';

export interface AuditLogResponse {
	auditId: string;
	action: string;
	performedBy: number;
	performerName: string;
	targetType: string;
	targetId: string;
	details: string;
	ipAddress: string;
	metadata: Record<string, unknown>;
	createdAt: string;
}

export interface AuditLogsListResponse {
	logs: AuditLogResponse[];
	total: number;
	page: number;
	limit: number;
	totalPages: number;
}

export interface GetAuditLogsParams {
	page?: number;
	limit?: number;
	action?: string;
	targetType?: string;
	search?: string;
}

export const auditApi = {
	/**
	 * Get audit logs with pagination and filters
	 */
	getAuditLogs: async (params?: GetAuditLogsParams): Promise<AuditLogsListResponse> => {
		const response = await api.get<{data: AuditLogsListResponse}>('/audit-logs', {
			params,
		});
		return response.data?.data;
	},
};
