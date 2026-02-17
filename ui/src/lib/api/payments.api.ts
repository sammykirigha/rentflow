import { Payment, RecordPaymentInput, TopupWalletInput, WalletTransaction } from '@/types/payments';
import api from '.';

export const paymentsApi = {
  getAll: async (params?: { page?: number; limit?: number; tenantId?: string; invoiceId?: string }) => {
    const response = await api.get('/payments', { params });
    return response.data?.data;
  },
  getByTenant: async (tenantId: string, params?: { page?: number; limit?: number }) => {
    const response = await api.get(`/payments/tenant/${tenantId}`, { params });
    return response.data?.data;
  },
  record: async (data: RecordPaymentInput): Promise<Payment> => {
    const response = await api.post('/payments', data);
    return response.data;
  },
};

export const walletApi = {
  getBalance: async (tenantId: string): Promise<{ tenantId: string; walletBalance: number }> => {
    const response = await api.get(`/wallet/${tenantId}`);
    return response.data;
  },
  getTransactions: async (tenantId: string, params?: { page?: number; limit?: number }) => {
    const response = await api.get(`/wallet/${tenantId}/transactions`, { params });
    return response.data;
  },
  getMyBalance: async (): Promise<{ tenantId: string; walletBalance: number }> => {
    const response = await api.get('/wallet/my-balance');
    return response.data;
  },
  getMyTransactions: async (params?: { page?: number; limit?: number }) => {
    const response = await api.get('/wallet/my-transactions', { params });
    return response.data;
  },
  topup: async (data: TopupWalletInput): Promise<{ transaction: WalletTransaction; walletBalance: number }> => {
    const response = await api.post('/wallet/topup', data);
    return response.data;
  },
};
