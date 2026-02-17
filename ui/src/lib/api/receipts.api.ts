import api from '.';

export const receiptsApi = {
  getAll: async (params?: { page?: number; limit?: number }) => {
    const response = await api.get('/receipts', { params });
    return response.data;
  },
  getOne: async (receiptId: string) => {
    const response = await api.get(`/receipts/${receiptId}`);
    return response.data;
  },
  downloadPdf: async (receiptId: string): Promise<void> => {
    const response = await api.get(`/receipts/${receiptId}/pdf`, {
      responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const disposition = response.headers['content-disposition'];
    const filename = disposition
      ? disposition.split('filename=')[1]?.replace(/"/g, '')
      : `receipt-${receiptId}.pdf`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};
