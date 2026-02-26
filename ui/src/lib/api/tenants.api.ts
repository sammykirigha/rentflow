import { Tenant, CreateTenantInput } from '@/types/tenants';
import api from '.';

export const tenantsApi = {
  getAll: async (params?: { page?: number; limit?: number; status?: string; search?: string; propertyId?: string }) => {
    const response = await api.get('/tenants', { params });
    return response.data;
  },
  getOne: async (tenantId: string): Promise<Tenant> => {
    const response = await api.get(`/tenants/${tenantId}`);
    return response.data;
  },
  create: async (data: CreateTenantInput): Promise<Tenant> => {
    const response = await api.post('/tenants', data);
    return response.data;
  },
  update: async (tenantId: string, data: Partial<{ leaseEnd: string; status: string; unitId: string }>): Promise<Tenant> => {
    const response = await api.patch(`/tenants/${tenantId}`, data);
    return response.data;
  },
  refundDeposit: async (tenantId: string, data: { amount: number; deductions?: { description: string; amount: number }[] }): Promise<Tenant> => {
    const response = await api.post(`/tenants/${tenantId}/refund-deposit`, data);
    return response.data;
  },
  vacate: async (tenantId: string): Promise<Tenant> => {
    const response = await api.post(`/tenants/${tenantId}/vacate`);
    return response.data;
  },
  delete: async (tenantId: string): Promise<void> => {
    await api.delete(`/tenants/${tenantId}`);
  },
};
