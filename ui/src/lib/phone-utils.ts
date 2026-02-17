/**
 * Normalize a Kenyan phone number to 254XXXXXXXXX format (no +)
 * Accepts: 0712345678, +254712345678, 254712345678
 */
export function normalizeKenyanPhone(phone: string): string {
  const cleaned = phone.replace(/\s+/g, '').replace(/[^0-9+]/g, '');

  if (cleaned.startsWith('+254')) {
    return cleaned.slice(1); // Remove the +
  }

  if (cleaned.startsWith('254')) {
    return cleaned;
  }

  if (cleaned.startsWith('0')) {
    return `254${cleaned.slice(1)}`;
  }

  return cleaned;
}

/**
 * Format phone for display: +254 7XX XXX XXX
 */
export function formatKenyanPhone(phone: string): string {
  const normalized = normalizeKenyanPhone(phone);
  if (normalized.length === 12) {
    return `+${normalized.slice(0, 3)} ${normalized.slice(3, 6)} ${normalized.slice(6, 9)} ${normalized.slice(9)}`;
  }
  return phone;
}

/**
 * Validate if a phone number is a valid Kenyan format
 */
export function isValidKenyanPhone(phone: string): boolean {
  return /^(?:\+254|0)\d{9}$/.test(phone.replace(/\s+/g, ''));
}
