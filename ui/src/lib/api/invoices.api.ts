import { Invoice, CreateInvoiceInput } from '@/types/invoices';
import api from '.';

export const invoicesApi = {
  getAll: async (params?: { page?: number; limit?: number; tenantId?: string; status?: string; billingMonth?: string }) => {
    const response = await api.get('/invoices', { params });
    return response.data?.data;
  },
  getOne: async (invoiceId: string): Promise<Invoice> => {
    const response = await api.get(`/invoices/${invoiceId}`);
    return response.data;
  },
  getByTenant: async (tenantId: string, params?: { page?: number; limit?: number }) => {
    const response = await api.get(`/invoices/tenant/${tenantId}`, { params });
    return response.data?.data;
  },
  create: async (data: CreateInvoiceInput): Promise<Invoice> => {
    const response = await api.post('/invoices', data);
    return response.data;
  },
  downloadPdf: async (invoiceId: string): Promise<void> => {
    const response = await api.get(`/invoices/${invoiceId}/pdf`, {
      responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const disposition = response.headers['content-disposition'];
    const filename = disposition
      ? disposition.split('filename=')[1]?.replace(/"/g, '')
      : `invoice-${invoiceId}.pdf`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};
