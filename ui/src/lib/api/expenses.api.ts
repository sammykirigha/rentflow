import api from '.';
import type {
  Expense,
  CreateExpenseInput,
  UpdateExpenseInput,
  Vendor,
  CreateVendorInput,
  UpdateVendorInput,
  MaintenanceRequest,
  CreateMaintenanceRequestInput,
  UpdateMaintenanceRequestInput,
} from '@/types/expenses';

export const expensesApi = {
  getAll: async (params?: {
    propertyId?: string;
    category?: string;
    status?: string;
    priority?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await api.get('/expenses', { params });
    return response.data;
  },

  getOne: async (expenseId: string): Promise<Expense> => {
    const response = await api.get(`/expenses/${expenseId}`);
    return response.data;
  },

  create: async (input: CreateExpenseInput): Promise<Expense> => {
    const response = await api.post('/expenses', input);
    return response.data;
  },

  update: async (expenseId: string, input: UpdateExpenseInput): Promise<Expense> => {
    const response = await api.patch(`/expenses/${expenseId}`, input);
    return response.data;
  },
};

export const vendorsApi = {
  getAll: async (params?: {
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await api.get('/vendors', { params });
    return response.data;
  },

  getOne: async (vendorId: string): Promise<Vendor> => {
    const response = await api.get(`/vendors/${vendorId}`);
    return response.data;
  },

  create: async (input: CreateVendorInput): Promise<Vendor> => {
    const response = await api.post('/vendors', input);
    return response.data;
  },

  update: async (vendorId: string, input: UpdateVendorInput): Promise<Vendor> => {
    const response = await api.patch(`/vendors/${vendorId}`, input);
    return response.data;
  },
};

export const maintenanceApi = {
  getAll: async (params?: {
    tenantId?: string;
    propertyId?: string;
    status?: string;
    category?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await api.get('/maintenance', { params });
    return response.data;
  },

  getMy: async (params?: {
    status?: string;
    category?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await api.get('/maintenance/my', { params });
    return response.data;
  },

  getOne: async (id: string): Promise<MaintenanceRequest> => {
    const response = await api.get(`/maintenance/${id}`);
    return response.data;
  },

  create: async (input: CreateMaintenanceRequestInput): Promise<MaintenanceRequest> => {
    const response = await api.post('/maintenance', input);
    return response.data;
  },

  update: async (id: string, input: UpdateMaintenanceRequestInput): Promise<MaintenanceRequest> => {
    const response = await api.patch(`/maintenance/${id}`, input);
    return response.data;
  },
};
