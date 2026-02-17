import { Unit } from './properties';

export enum TenantStatus {
  ACTIVE = 'active',
  NOTICE_PERIOD = 'notice_period',
  VACATED = 'vacated',
}

export interface TenantUser {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export interface Tenant {
  tenantId: string;
  userId: string;
  unitId: string;
  walletBalance: number;
  status: TenantStatus;
  leaseStart: string;
  leaseEnd?: string;
  user: TenantUser;
  unit: Unit;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTenantInput {
  name: string;
  email: string;
  phone: string;
  unitId: string;
  leaseStart: string;
  leaseEnd?: string;
}
