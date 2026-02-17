import { Property, Unit, CreatePropertyInput, CreateUnitInput, BulkCreateUnitsInput } from '@/types/properties';
import api from '.';

export const propertiesApi = {
  getAll: async (params?: { page?: number; limit?: number; search?: string; isActive?: boolean }) => {
    const response = await api.get('/properties', { params });
    return response.data?.data;
  },
  getOne: async (propertyId: string): Promise<Property> => {
    const response = await api.get(`/properties/${propertyId}`);
    return response.data;
  },
  create: async (data: CreatePropertyInput): Promise<Property> => {
    const response = await api.post('/properties', data);
    return response.data;
  },
  update: async (propertyId: string, data: Partial<CreatePropertyInput>): Promise<Property> => {
    const response = await api.patch(`/properties/${propertyId}`, data);
    return response.data;
  },
};

export const unitsApi = {
  getByProperty: async (propertyId: string, params?: { page?: number; limit?: number }) => {
    const response = await api.get(`/units/property/${propertyId}`, { params });
    return response.data?.data;
  },
  getVacant: async (propertyId: string): Promise<Unit[]> => {
    const response = await api.get(`/units/property/${propertyId}/vacant`);
    const result = response.data;
    return Array.isArray(result) ? result : result?.data ?? [];
  },
  create: async (data: CreateUnitInput): Promise<Unit> => {
    const response = await api.post('/units', data);
    return response.data;
  },
  bulkCreate: async (data: BulkCreateUnitsInput): Promise<Unit[]> => {
    const response = await api.post('/units/bulk', data);
    return response.data;
  },
  update: async (unitId: string, data: Partial<{ unitNumber: string; rentAmount: number; unitType: string }>): Promise<Unit> => {
    const response = await api.patch(`/units/${unitId}`, data);
    return response.data;
  },
};
