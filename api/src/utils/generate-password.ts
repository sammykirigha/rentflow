/**
 * Generate a readable tenant password in the format Rent@XXXX
 * where XXXX is a random 4-digit number.
 */
export function generateTenantPassword(): string {
	const pin = Math.floor(1000 + Math.random() * 9000);
	return `Rent@${pin}`;
}
