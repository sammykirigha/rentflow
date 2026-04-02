import api from '.';

export interface PlatformDashboard {
  totalOrganizations: number;
  activeOrganizations: number;
  trialOrganizations: number;
  suspendedOrganizations: number;
}

export interface PlatformOrganization {
  organizationId: string;
  name: string;
  slug: string;
  status: string;
  ownerUserId: string;
  createdAt: string;
}

export interface PlatformConfig {
  platformConfigId: string;
  key: string;
  value: string;
  description?: string;
}

export interface CreateOrganizationPayload {
  name: string;
  slug: string;
  ownerEmail: string;
  ownerFirstName: string;
  ownerLastName: string;
  ownerPhone?: string;
  plan?: string;
}

export async function getPlatformDashboard(): Promise<PlatformDashboard> {
  const response = await api.get('/platform/dashboard');
  return response.data;
}

export async function getPlatformOrganizations(
  page = 1,
  limit = 20,
  status?: string,
  search?: string,
) {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(limit));
  if (status) params.set('status', status);
  if (search) params.set('search', search);

  const response = await api.get(`/platform/organizations?${params.toString()}`);
  return response.data;
}

export async function getPlatformOrganization(id: string) {
  const response = await api.get(`/platform/organizations/${id}`);
  return response.data;
}

export async function createPlatformOrganization(data: CreateOrganizationPayload) {
  const response = await api.post('/platform/organizations', data);
  return response.data;
}

export async function updatePlatformOrganization(id: string, data: Record<string, unknown>) {
  const response = await api.patch(`/platform/organizations/${id}`, data);
  return response.data;
}

export async function resendInvitation(id: string) {
  const response = await api.post(`/platform/organizations/${id}/resend-invitation`);
  return response.data;
}

export async function updatePlatformOrganizationOwner(
  id: string,
  data: { firstName?: string; lastName?: string; email?: string; phone?: string },
) {
  const response = await api.patch(`/platform/organizations/${id}/owner`, data);
  return response.data;
}

export async function suspendOrganization(id: string) {
  const response = await api.patch(`/platform/organizations/${id}/suspend`);
  return response.data;
}

export async function activateOrganization(id: string) {
  const response = await api.patch(`/platform/organizations/${id}/activate`);
  return response.data;
}

export async function getPlatformConfig(): Promise<PlatformConfig[]> {
  const response = await api.get('/platform/config');
  return response.data;
}

export async function updatePlatformConfig(data: { key: string; value: string; description?: string }) {
  const response = await api.patch('/platform/config', data);
  return response.data;
}
