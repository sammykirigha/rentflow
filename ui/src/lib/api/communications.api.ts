import api from '.';

export interface Notification {
  notificationId: string;
  tenantId: string;
  invoiceId?: string;
  type: string;
  channel: string;
  subject?: string;
  message: string;
  sentAt?: string;
  deliveredAt?: string;
  failReason?: string;
  status: 'pending' | 'sent' | 'failed';
  retryCount: number;
  createdAt: string;
  tenant?: {
    tenantId: string;
    user?: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
    };
  };
}

export interface SendNotificationInput {
  tenantId: string;
  invoiceId?: string;
  type: string;
  channel: string;
  subject?: string;
  message: string;
}

export interface SendBulkReminderInput {
  type?: string;
  channel: string;
  subject?: string;
  message: string;
}

export interface SendBulkMessageInput {
  channel: string;
  subject?: string;
  message: string;
}

export const communicationsApi = {
  getAll: async (params?: {
    tenantId?: string;
    type?: string;
    channel?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await api.get('/communications', { params });
    return response.data;
  },

  send: async (input: SendNotificationInput): Promise<Notification> => {
    const response = await api.post('/communications/send', input);
    return response.data;
  },

  sendBulkReminder: async (input: SendBulkReminderInput): Promise<{ count: number }> => {
    const response = await api.post('/communications/bulk-reminder', input);
    return response.data;
  },

  sendBulkMessage: async (input: SendBulkMessageInput): Promise<{ count: number }> => {
    const response = await api.post('/communications/bulk-message', input);
    return response.data;
  },

  resend: async (notificationId: string): Promise<Notification> => {
    const response = await api.post(`/communications/${notificationId}/resend`);
    return response.data;
  },

  delete: async (notificationId: string): Promise<void> => {
    await api.delete(`/communications/${notificationId}`);
  },
};
