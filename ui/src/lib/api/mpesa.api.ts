import { StkPushResponse, StkStatusResponse } from '@/types/payments';
import api from '.';

export const mpesaApi = {
  initiateStkPush: async (data: { amount: number; phoneNumber?: string }): Promise<StkPushResponse> => {
    const response = await api.post('/mpesa/stk-push', data);
    return response.data;
  },
  checkStkStatus: async (paymentId: string): Promise<StkStatusResponse> => {
    const response = await api.get(`/mpesa/stk-status/${paymentId}`);
    return response.data;
  },
};
