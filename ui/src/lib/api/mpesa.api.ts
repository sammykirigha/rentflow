import { StkPushResponse, StkStatusResponse } from '@/types/payments';
import api from '.';

export const mpesaApi = {
  initiateStkPush: async (data: { amount: number; phoneNumber?: string }): Promise<StkPushResponse> => {
    const response = await api.post('/payments/mobile/stk-push', data);
    return response.data;
  },
  checkStkStatus: async (paymentId: string): Promise<StkStatusResponse> => {
    const response = await api.get(`/payments/mobile/stk-status/${paymentId}`);
    return response.data;
  },
  adminInitiateStkPush: async (data: { tenantId: string; amount: number; phoneNumber?: string }): Promise<StkPushResponse> => {
    const response = await api.post('/payments/mobile/admin/stk-push', data);
    return response.data;
  },
  adminCheckStkStatus: async (paymentId: string): Promise<StkStatusResponse> => {
    const response = await api.get(`/payments/mobile/admin/stk-status/${paymentId}`);
    return response.data;
  },
};
