// Shared status color and label maps used across payment, invoice, and wallet UI

export const INVOICE_STATUS_COLOR: Record<string, string> = {
  paid: 'green',
  partially_paid: 'orange',
  unpaid: 'red',
  overdue: 'volcano',
  cancelled: 'default',
};

export const INVOICE_STATUS_LABEL: Record<string, string> = {
  paid: 'Paid',
  partially_paid: 'Partially Paid',
  unpaid: 'Unpaid',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
};

export const PAYMENT_STATUS_COLOR: Record<string, string> = {
  pending: 'orange',
  completed: 'green',
  failed: 'red',
  reversed: 'default',
};

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  completed: 'Completed',
  failed: 'Failed',
  reversed: 'Reversed',
};

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  mpesa_paybill: 'M-Pesa Paybill',
  mpesa_stk_push: 'M-Pesa STK Push',
  wallet_deduction: 'Wallet Deduction',
  manual: 'Manual',
};

export const PAYMENT_METHOD_COLOR: Record<string, string> = {
  mpesa_paybill: 'green',
  mpesa_stk_push: 'cyan',
  wallet_deduction: 'blue',
  manual: 'default',
};

export const WALLET_TXN_TYPE_LABEL: Record<string, string> = {
  credit: 'Credit',
  credit_reconciliation: 'Reconciled Payment',
  debit_invoice: 'Invoice Deduction',
  debit_penalty: 'Penalty Deduction',
  refund: 'Refund',
};

export const WALLET_TXN_TYPE_COLOR: Record<string, string> = {
  credit: 'green',
  credit_reconciliation: 'cyan',
  debit_invoice: 'red',
  debit_penalty: 'volcano',
  refund: 'blue',
};
