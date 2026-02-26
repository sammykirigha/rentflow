import { Unit } from './properties';

export enum TenantStatus {
  ACTIVE = 'active',
  NOTICE_PERIOD = 'notice_period',
  VACATED = 'vacated',
}

export enum DepositStatus {
  PENDING = 'pending',
  COLLECTED = 'collected',
  PARTIALLY_REFUNDED = 'partially_refunded',
  FULLY_REFUNDED = 'fully_refunded',
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
  depositAmount: number;
  depositStatus: DepositStatus;
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
  depositAmount?: number;
}
