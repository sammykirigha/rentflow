import { Tenant } from './tenants';
import { Invoice } from './invoices';

export enum PaymentMethod {
  MPESA_PAYBILL = 'mpesa_paybill',
  MPESA_STK_PUSH = 'mpesa_stk_push',
  WALLET_DEDUCTION = 'wallet_deduction',
  MANUAL = 'manual',
}

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REVERSED = 'reversed',
}

export interface Payment {
  paymentId: string;
  tenantId?: string;
  invoiceId?: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  mpesaReceiptNumber?: string;
  mpesaPhoneNumber?: string;
  mpesaAccountReference?: string;
  mpesaPaybillNumber?: string;
  transactionDate: string;
  needsReconciliation: boolean;
  reconciliationNote?: string;
  reconciledAt?: string;
  reconciledBy?: string;
  tenant?: Tenant;
  invoice?: Invoice;
  createdAt: string;
  updatedAt: string;
}

export interface RecordPaymentInput {
  tenantId: string;
  amount: number;
  method: PaymentMethod;
  mpesaReceiptNumber?: string;
  mpesaPhoneNumber?: string;
}

export enum WalletTxnType {
  CREDIT = 'credit',
  CREDIT_RECONCILIATION = 'credit_reconciliation',
  DEBIT_INVOICE = 'debit_invoice',
  DEBIT_PENALTY = 'debit_penalty',
  REFUND = 'refund',
}

export interface WalletTransaction {
  walletTransactionId: string;
  tenantId: string;
  type: WalletTxnType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  reference?: string;
  description?: string;
  createdAt: string;
}

export interface TopupWalletInput {
  amount: number;
  mpesaReceiptNumber?: string;
}

export interface StkPushResponse {
  paymentId: string;
  checkoutRequestId: string;
}

export interface StkStatusResponse {
  status: PaymentStatus;
  resultDesc?: string;
}

export interface LedgerTransaction extends WalletTransaction {
  tenant?: {
    tenantId: string;
    walletBalance: number;
    user?: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
    };
    unit?: {
      unitNumber: string;
      property?: {
        name: string;
      };
    };
  };
}
