import api from '.';

export interface OrganizationCredentialStatus {
  mpesa: {
    isConfigured: boolean;
    shortcode: string | null;
    environment: string;
    consumerKeyMask: string | null;
    callbackBaseUrl: string | null;
  };
  sms: {
    isConfigured: boolean;
    username: string | null;
    senderId: string | null;
    apiKeyMask: string | null;
  };
}

export async function getCurrentOrganization() {
  const response = await api.get('/organizations/current');
  return response.data;
}

export async function updateCurrentOrganization(data: Record<string, unknown>) {
  const response = await api.patch('/organizations/current', data);
  return response.data;
}

export async function getCurrentOrgCredentials(): Promise<OrganizationCredentialStatus> {
  const response = await api.get('/organizations/current/credentials');
  return response.data;
}

export async function registerMpesaC2bUrls(): Promise<{ success: boolean; message: string }> {
  const response = await api.post('/payments/mobile/register-c2b');
  return response.data;
}
