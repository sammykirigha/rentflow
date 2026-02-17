import { Tenant } from './tenants';

export enum InvoiceStatus {
  PAID = 'paid',
  PARTIALLY_PAID = 'partially_paid',
  UNPAID = 'unpaid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
}

export interface Invoice {
  invoiceId: string;
  invoiceNumber: string;
  tenantId: string;
  billingMonth: string;
  rentAmount: number;
  waterCharge: number;
  electricityCharge: number;
  otherCharges: number;
  otherChargesDesc?: string;
  subtotal: number;
  penaltyAmount: number;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  status: InvoiceStatus;
  dueDate: string;
  paidAt?: string;
  penaltyAppliedAt?: string;
  notes?: string;
  tenant?: Tenant;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInvoiceInput {
  tenantId: string;
  billingMonth: string;
  rentAmount: number;
  waterCharge?: number;
  electricityCharge?: number;
  otherCharges?: number;
  otherChargesDesc?: string;
  dueDate: string;
  notes?: string;
}
