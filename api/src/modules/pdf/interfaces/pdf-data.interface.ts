export interface InvoicePdfData {
	// Company info (from SystemSettings)
	companyName: string;
	companyEmail: string;
	companyPhone?: string;
	companyAddress?: string;
	companyLogoUrl?: string;
	primaryColor?: string;
	tagline?: string;

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
	primaryColor?: string;
	tagline?: string;

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

export interface OwnerReportPdfData {
	// Company info
	companyName: string;
	companyEmail: string;
	companyPhone?: string;
	companyAddress?: string;
	companyLogoUrl?: string;
	primaryColor?: string;
	tagline?: string;

	// Report period
	reportMonth: string; // e.g. "February 2026"
	generatedAt: string;

	// Financial summary
	totalRevenue: number;
	totalExpenses: number;
	netIncome: number;
	collectionRate: number; // percentage

	// Occupancy
	totalUnits: number;
	occupiedUnits: number;
	vacantUnits: number;
	occupancyRate: number;

	// Per-property breakdown
	properties: Array<{
		name: string;
		units: number;
		occupied: number;
		revenue: number;
		expenses: number;
		netIncome: number;
	}>;

	// Top debtors
	topDebtors: Array<{
		tenantName: string;
		unitNumber: string;
		propertyName: string;
		totalOwed: number;
	}>;

	// Maintenance summary
	maintenanceOpen: number;
	maintenanceResolved: number;
	maintenanceUrgent: number;
}

export interface ReceiptPdfData {
	// Company info
	companyName: string;
	companyEmail: string;
	companyPhone?: string;
	companyAddress?: string;
	companyLogoUrl?: string;
	primaryColor?: string;
	tagline?: string;

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
