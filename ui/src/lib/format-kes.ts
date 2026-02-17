/**
 * Format a number as KES currency
 * @param amount - The amount to format
 * @returns Formatted string like "KES 35,000"
 */
export function formatKES(amount: number): string {
  return `KES ${amount.toLocaleString('en-KE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}
