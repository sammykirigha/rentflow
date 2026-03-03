import { Tenant } from './tenants';

export enum InvoiceStatus {
  PAID = 'paid',
  PARTIALLY_PAID = 'partially_paid',
  UNPAID = 'unpaid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
}

export enum InvoiceType {
  RENT = 'rent',
  SECURITY_DEPOSIT = 'security_deposit',
  SERVICE_FEE = 'service_fee',
  MAINTENANCE = 'maintenance',
  OTHER = 'other',
}

export const INVOICE_TYPE_LABELS: Record<InvoiceType, string> = {
  [InvoiceType.RENT]: 'Rent',
  [InvoiceType.SECURITY_DEPOSIT]: 'Security Deposit',
  [InvoiceType.SERVICE_FEE]: 'Service Fee',
  [InvoiceType.MAINTENANCE]: 'Maintenance',
  [InvoiceType.OTHER]: 'Other',
};

export interface Invoice {
  invoiceId: string;
  invoiceNumber: string;
  invoiceType: InvoiceType;
  tenantId: string | null;
  recipientName?: string;
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
  invoiceType: InvoiceType;
  tenantId?: string;
  recipientName?: string;
  billingMonth: string;
  rentAmount: number;
  waterCharge?: number;
  electricityCharge?: number;
  otherCharges?: number;
  otherChargesDesc?: string;
  dueDate: string;
  notes?: string;
}

export interface UpdateInvoiceInput {
  invoiceType?: InvoiceType;
  recipientName?: string;
  billingMonth?: string;
  rentAmount?: number;
  waterCharge?: number;
  electricityCharge?: number;
  otherCharges?: number;
  otherChargesDesc?: string;
  dueDate?: string;
  status?: InvoiceStatus;
  notes?: string;
}
