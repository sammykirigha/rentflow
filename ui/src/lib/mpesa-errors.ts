/**
 * Maps M-Pesa error codes and messages to user-friendly descriptions.
 */

const MPESA_ERROR_MAP: Record<string, string> = {
  // STK Push result codes
  '1': 'The payment request was cancelled or timed out. Please try again.',
  '1032': 'You cancelled the M-Pesa request. Try again when ready.',
  '1037': 'M-Pesa service timed out. Please try again in a moment.',
  '2001': 'Wrong M-Pesa PIN entered. Please try again with the correct PIN.',
  '1001': 'Insufficient M-Pesa balance. Please top up your M-Pesa and try again.',
  '1019': 'Transaction expired. Please initiate a new payment.',
  '1025': 'An error occurred at M-Pesa. Please try again later.',
  '17': 'A rule was violated. Please contact support if this persists.',

  // Generic patterns
  'insufficient balance': 'Insufficient M-Pesa balance. Please top up and try again.',
  'wrong pin': 'Wrong M-Pesa PIN entered. Please try again.',
  'cancelled': 'You cancelled the payment request.',
  'timeout': 'The request timed out. Please try again.',
  'user did not authorize': 'You did not authorize the payment. Please try again.',
  'transaction limit': 'Amount exceeds your M-Pesa transaction limit.',
  'system busy': 'M-Pesa is currently busy. Please try again in a few minutes.',
};

export function getMpesaErrorMessage(errorCode?: string, errorMessage?: string): string {
  if (errorCode && MPESA_ERROR_MAP[errorCode]) {
    return MPESA_ERROR_MAP[errorCode];
  }

  if (errorMessage) {
    const lower = errorMessage.toLowerCase();
    for (const [key, friendlyMessage] of Object.entries(MPESA_ERROR_MAP)) {
      if (lower.includes(key.toLowerCase())) {
        return friendlyMessage;
      }
    }
  }

  return errorMessage || 'An error occurred with the M-Pesa payment. Please try again.';
}

/**
 * Validates and normalizes a Kenyan phone number for M-Pesa.
 * Accepts: 0712345678, +254712345678, 254712345678, 712345678
 * Returns null if invalid.
 */
export function normalizeKenyanPhone(phone: string): string | null {
  const cleaned = phone.replace(/[\s\-()]/g, '');

  // Match various Kenyan formats
  const match = cleaned.match(/^(?:\+?254|0)?([17]\d{8})$/);
  if (!match) return null;

  return `254${match[1]}`;
}

export function isValidKenyanPhone(phone: string): boolean {
  return normalizeKenyanPhone(phone) !== null;
}
