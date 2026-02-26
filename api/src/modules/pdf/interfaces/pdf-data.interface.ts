export interface InvoicePdfData {
	// Company info (from SystemSettings)
	companyName: string;
	companyEmail: string;
	companyPhone?: string;
	companyAddress?: string;
	companyLogoUrl?: string;

	// Invoice info
	invoiceNumber: string;
	invoiceDate: string;
	dueDate: string;
	status: string;

	// Tenant info
	tenantName: string;
	tenantPhone: string;
	tenantEmail: string;
	unitNumber: string;
	propertyName: string;

	// Charges
	rentAmount: number;
	waterCharge: number;
	electricityCharge: number;
	otherCharges: number;
	otherChargesDesc?: string;
	penaltyAmount: number;
	subtotal: number;
	totalAmount: number;
	amountPaid: number;
	balanceDue: number;

	// Payment instructions
	paybillNumber?: string;
	accountRef: string; // unit number
}

export interface StatementPdfData {
	// Company info
	companyName: string;
	companyEmail: string;
	companyPhone?: string;
	companyAddress?: string;
	companyLogoUrl?: string;

	// Tenant info
	tenantName: string;
	tenantPhone: string;
	tenantEmail: string;
	unitNumber: string;
	propertyName: string;

	// Statement period
	startDate: string;
	endDate: string;

	// Summary
	openingBalance: number;
	closingBalance: number;
	totalCredits: number;
	totalDebits: number;

	// Transactions
	transactions: Array<{
		date: string;
		type: string;
		description: string;
		reference: string;
		debit: number;
		credit: number;
		balance: number;
	}>;
}

export interface ReceiptPdfData {
	// Company info
	companyName: string;
	companyEmail: string;
	companyPhone?: string;
	companyAddress?: string;
	companyLogoUrl?: string;

	// Receipt info
	receiptNumber: string;
	receiptDate: string;
	invoiceNumber: string;

	// Tenant info
	tenantName: string;
	tenantPhone: string;
	tenantEmail: string;
	unitNumber: string;
	propertyName: string;

	// Financial
	totalPaid: number;

	// Charges breakdown (from the invoice)
	rentAmount: number;
	waterCharge: number;
	electricityCharge: number;
	otherCharges: number;
	otherChargesDesc?: string;
	penaltyAmount: number;
	totalAmount: number;
}
