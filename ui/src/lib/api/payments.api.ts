import { Payment, RecordPaymentInput, TopupWalletInput, WalletTransaction } from '@/types/payments';
import api from '.';

export const paymentsApi = {
  getAll: async (params?: { page?: number; limit?: number; tenantId?: string; invoiceId?: string }) => {
    const response = await api.get('/payments', { params });
    return response.data;
  },
  getMy: async (params?: { page?: number; limit?: number }) => {
    const response = await api.get('/payments/my', { params });
    return response.data;
  },
  getByTenant: async (tenantId: string, params?: { page?: number; limit?: number }) => {
    const response = await api.get(`/payments/tenant/${tenantId}`, { params });
    return response.data;
  },
  record: async (data: RecordPaymentInput): Promise<Payment> => {
    const response = await api.post('/payments', data);
    return response.data;
  },
  getReconciliationQueue: async (params?: { page?: number; limit?: number }) => {
    const response = await api.get('/payments/reconciliation-queue', { params });
    return response.data;
  },
  reconcilePayment: async (paymentId: string, data: { targetTenantId: string; note?: string }): Promise<Payment> => {
    const response = await api.post(`/payments/${paymentId}/reconcile`, data);
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
  downloadMyStatement: async (params?: { startDate?: string; endDate?: string }): Promise<void> => {
    const response = await api.get('/wallet/my-statement', {
      params,
      responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const disposition = response.headers['content-disposition'];
    const filename = disposition
      ? disposition.split('filename=')[1]?.replace(/"/g, '')
      : 'wallet-statement.pdf';
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
  getLedger: async (params?: {
    page?: number;
    limit?: number;
    tenantId?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const response = await api.get('/wallet/ledger', { params });
    return response.data;
  },
  downloadStatement: async (
    tenantId: string,
    params?: { startDate?: string; endDate?: string },
  ): Promise<void> => {
    const response = await api.get(`/wallet/${tenantId}/statement`, {
      params,
      responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const disposition = response.headers['content-disposition'];
    const filename = disposition
      ? disposition.split('filename=')[1]?.replace(/"/g, '')
      : `statement-${tenantId}.pdf`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};
