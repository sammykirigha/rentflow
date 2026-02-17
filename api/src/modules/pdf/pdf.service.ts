import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import puppeteer, { Browser } from 'puppeteer';
import { InvoicePdfData, ReceiptPdfData } from './interfaces/pdf-data.interface';

@Injectable()
export class PdfService implements OnModuleDestroy {
	private readonly logger = new Logger(PdfService.name);
	private browser: Browser | null = null;

	private async getBrowser(): Promise<Browser> {
		if (!this.browser || !this.browser.connected) {
			this.browser = await puppeteer.launch({
				headless: true,
				args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
			});
		}
		return this.browser;
	}

	async onModuleDestroy() {
		if (this.browser) {
			await this.browser.close();
			this.browser = null;
		}
	}

	private async htmlToPdf(html: string): Promise<Buffer> {
		const browser = await this.getBrowser();
		const page = await browser.newPage();
		try {
			await page.setContent(html, { waitUntil: 'networkidle0' });
			const pdfBuffer = await page.pdf({
				format: 'A4',
				printBackground: true,
				margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
			});
			return Buffer.from(pdfBuffer);
		} finally {
			await page.close();
		}
	}

	async generateInvoicePdf(data: InvoicePdfData): Promise<Buffer> {
		const chargesRows = this.buildChargesRows(data);

		const statusColor =
			data.status === 'paid' ? '#52c41a' : data.status === 'overdue' ? '#ff4d4f' : '#333';

		const html = `<!DOCTYPE html>
<html>
<head>
<style>
	* { margin: 0; padding: 0; box-sizing: border-box; }
	body { font-family: 'Segoe UI', Arial, sans-serif; color: #333; font-size: 13px; line-height: 1.5; }
	.header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
	.company-name { font-size: 20px; font-weight: 700; color: #1a1a1a; }
	.company-info { font-size: 11px; color: #666; }
	.invoice-title { font-size: 28px; font-weight: 700; color: #1a1a1a; text-align: right; }
	.invoice-number { font-size: 12px; color: #666; text-align: right; margin-top: 4px; }
	.divider { border: none; border-top: 1px solid #ccc; margin: 12px 0; }
	.meta-section { display: flex; justify-content: space-between; margin: 16px 0; }
	.section-header { font-size: 11px; font-weight: 700; color: #333; text-transform: uppercase; margin-bottom: 6px; }
	.bill-to-name { font-size: 14px; font-weight: 600; color: #333; margin-bottom: 2px; }
	.meta-right { text-align: right; font-size: 12px; color: #333; }
	.meta-right div { margin-bottom: 3px; }
	table { width: 100%; border-collapse: collapse; margin-top: 16px; }
	th { font-size: 11px; font-weight: 700; color: #333; text-align: left; padding: 8px; border-bottom: 2px solid #333; }
	th.right { text-align: right; }
	td { font-size: 12px; padding: 8px; border-bottom: 1px solid #eee; }
	td.right { text-align: right; }
	td.penalty { color: #cc0000; }
	.totals { margin-top: 12px; display: flex; justify-content: flex-end; }
	.totals-table { width: 260px; }
	.totals-table td { border: none; padding: 4px 8px; }
	.totals-table .total-row td { font-weight: 700; font-size: 13px; border-top: 1px solid #333; }
	.totals-table .paid td { color: #52c41a; }
	.totals-table .due td { color: #ff4d4f; font-weight: 700; font-size: 13px; }
	.payment-section { margin-top: 28px; }
	.payment-table td { border: none; padding: 3px 0; font-size: 11px; color: #666; }
	.payment-table td:first-child { font-weight: 700; padding-right: 12px; }
	.terms { margin-top: 20px; }
	.terms p { font-size: 10px; color: #999; font-style: italic; margin-top: 4px; }
	.footer { text-align: center; font-size: 9px; color: #ccc; margin-top: 30px; }
</style>
</head>
<body>
	<div class="header">
		<div>
			<div class="company-name">${this.esc(data.companyName)}</div>
			${data.companyAddress ? `<div class="company-info">${this.esc(data.companyAddress)}</div>` : ''}
			${data.companyPhone ? `<div class="company-info">Tel: ${this.esc(data.companyPhone)}</div>` : ''}
			<div class="company-info">${this.esc(data.companyEmail)}</div>
		</div>
		<div>
			<div class="invoice-title">INVOICE</div>
			<div class="invoice-number">${this.esc(data.invoiceNumber)}</div>
		</div>
	</div>

	<hr class="divider" />

	<div class="meta-section">
		<div>
			<div class="section-header">Billed To</div>
			<div class="bill-to-name">${this.esc(data.tenantName)}</div>
			<div class="company-info">${this.esc(data.tenantPhone)}</div>
			<div class="company-info">${this.esc(data.tenantEmail)}</div>
			<div class="company-info">Unit: ${this.esc(data.unitNumber)}</div>
			<div class="company-info">${this.esc(data.propertyName)}</div>
		</div>
		<div class="meta-right">
			<div>Invoice Date: ${this.esc(data.invoiceDate)}</div>
			<div>Due Date: ${this.esc(data.dueDate)}</div>
			<div style="font-weight:700;color:${statusColor}">Status: ${data.status.toUpperCase()}</div>
		</div>
	</div>

	<table>
		<thead>
			<tr><th>Description</th><th class="right">Amount (KES)</th></tr>
		</thead>
		<tbody>${chargesRows}</tbody>
	</table>

	<div class="totals">
		<table class="totals-table">
			<tr><td class="right">Subtotal</td><td class="right">${this.formatKES(data.subtotal)}</td></tr>
			${data.penaltyAmount > 0 ? `<tr><td class="right penalty">Penalty</td><td class="right penalty">${this.formatKES(data.penaltyAmount)}</td></tr>` : ''}
			<tr class="total-row"><td class="right">Total</td><td class="right">${this.formatKES(data.totalAmount)}</td></tr>
			${data.amountPaid > 0 ? `<tr class="paid"><td class="right">Amount Paid</td><td class="right">${this.formatKES(data.amountPaid)}</td></tr>` : ''}
			${data.balanceDue > 0 ? `<tr class="due"><td class="right">Balance Due</td><td class="right">${this.formatKES(data.balanceDue)}</td></tr>` : ''}
		</table>
	</div>

	<div class="payment-section">
		<div class="section-header">Payment Instructions</div>
		<table class="payment-table">
			${data.paybillNumber ? `<tr><td>M-Pesa Paybill:</td><td>${this.esc(data.paybillNumber)}</td></tr>` : ''}
			<tr><td>Account Number:</td><td>${this.esc(data.accountRef)}</td></tr>
		</table>
	</div>

	<div class="terms">
		<div class="section-header">Terms &amp; Conditions</div>
		<p>Late payments attract a 5% penalty on outstanding balance applied after the due date.</p>
	</div>

	<div class="footer">Generated by ${this.esc(data.companyName)}</div>
</body>
</html>`;

		return this.htmlToPdf(html);
	}

	async generateReceiptPdf(data: ReceiptPdfData): Promise<Buffer> {
		const chargesRows = this.buildReceiptChargesRows(data);

		const html = `<!DOCTYPE html>
<html>
<head>
<style>
	* { margin: 0; padding: 0; box-sizing: border-box; }
	body { font-family: 'Segoe UI', Arial, sans-serif; color: #333; font-size: 13px; line-height: 1.5; }
	.header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
	.company-name { font-size: 20px; font-weight: 700; color: #1a1a1a; }
	.company-info { font-size: 11px; color: #666; }
	.receipt-title { font-size: 28px; font-weight: 700; color: #52c41a; text-align: right; }
	.receipt-number { font-size: 12px; color: #666; text-align: right; margin-top: 4px; }
	.divider { border: none; border-top: 1px solid #ccc; margin: 12px 0; }
	.paid-badge { text-align: center; font-size: 16px; font-weight: 700; color: #52c41a; border: 2px solid #52c41a; padding: 10px; margin: 16px 0; }
	.meta-section { display: flex; justify-content: space-between; margin: 16px 0; }
	.section-header { font-size: 11px; font-weight: 700; color: #333; text-transform: uppercase; margin-bottom: 6px; }
	.bill-to-name { font-size: 14px; font-weight: 600; color: #333; margin-bottom: 2px; }
	.meta-right { text-align: right; font-size: 12px; color: #333; }
	.meta-right div { margin-bottom: 3px; }
	table { width: 100%; border-collapse: collapse; margin-top: 16px; }
	th { font-size: 11px; font-weight: 700; color: #333; text-align: left; padding: 8px; border-bottom: 2px solid #333; }
	th.right { text-align: right; }
	td { font-size: 12px; padding: 8px; border-bottom: 1px solid #eee; }
	td.right { text-align: right; }
	.totals { margin-top: 12px; display: flex; justify-content: flex-end; }
	.totals-table { width: 260px; }
	.totals-table td { border: none; padding: 4px 8px; }
	.totals-table .total-row td { font-weight: 700; font-size: 13px; color: #52c41a; border-top: 1px solid #333; }
	.thank-you { text-align: center; font-size: 14px; color: #333; font-style: italic; margin-top: 30px; }
	.footer { text-align: center; font-size: 9px; color: #ccc; margin-top: 30px; }
</style>
</head>
<body>
	<div class="header">
		<div>
			<div class="company-name">${this.esc(data.companyName)}</div>
			${data.companyAddress ? `<div class="company-info">${this.esc(data.companyAddress)}</div>` : ''}
			${data.companyPhone ? `<div class="company-info">Tel: ${this.esc(data.companyPhone)}</div>` : ''}
			<div class="company-info">${this.esc(data.companyEmail)}</div>
		</div>
		<div>
			<div class="receipt-title">RECEIPT</div>
			<div class="receipt-number">${this.esc(data.receiptNumber)}</div>
		</div>
	</div>

	<hr class="divider" />

	<div class="paid-badge">PAID IN FULL</div>

	<div class="meta-section">
		<div>
			<div class="section-header">Received From</div>
			<div class="bill-to-name">${this.esc(data.tenantName)}</div>
			<div class="company-info">${this.esc(data.tenantPhone)}</div>
			<div class="company-info">${this.esc(data.tenantEmail)}</div>
			<div class="company-info">Unit: ${this.esc(data.unitNumber)}</div>
			<div class="company-info">${this.esc(data.propertyName)}</div>
		</div>
		<div class="meta-right">
			<div>Receipt Date: ${this.esc(data.receiptDate)}</div>
			<div>Invoice: ${this.esc(data.invoiceNumber)}</div>
		</div>
	</div>

	<table>
		<thead>
			<tr><th>Description</th><th class="right">Amount (KES)</th></tr>
		</thead>
		<tbody>${chargesRows}</tbody>
	</table>

	<div class="totals">
		<table class="totals-table">
			<tr><td class="right">Total Amount</td><td class="right">${this.formatKES(data.totalAmount)}</td></tr>
			<tr class="total-row"><td class="right">Total Paid</td><td class="right">${this.formatKES(data.totalPaid)}</td></tr>
		</table>
	</div>

	<div class="thank-you">Thank you for your payment!</div>
	<div class="footer">Generated by ${this.esc(data.companyName)}</div>
</body>
</html>`;

		return this.htmlToPdf(html);
	}

	private buildChargesRows(data: InvoicePdfData): string {
		let rows = `<tr><td>Rent</td><td class="right">${this.formatKES(data.rentAmount)}</td></tr>`;
		if (data.waterCharge > 0)
			rows += `<tr><td>Water Charge</td><td class="right">${this.formatKES(data.waterCharge)}</td></tr>`;
		if (data.electricityCharge > 0)
			rows += `<tr><td>Electricity Charge</td><td class="right">${this.formatKES(data.electricityCharge)}</td></tr>`;
		if (data.otherCharges > 0)
			rows += `<tr><td>${this.esc(data.otherChargesDesc || 'Other Charges')}</td><td class="right">${this.formatKES(data.otherCharges)}</td></tr>`;
		if (data.penaltyAmount > 0)
			rows += `<tr><td class="penalty">Late Payment Penalty</td><td class="right penalty">${this.formatKES(data.penaltyAmount)}</td></tr>`;
		return rows;
	}

	private buildReceiptChargesRows(data: ReceiptPdfData): string {
		let rows = `<tr><td>Rent</td><td class="right">${this.formatKES(data.rentAmount)}</td></tr>`;
		if (data.waterCharge > 0)
			rows += `<tr><td>Water Charge</td><td class="right">${this.formatKES(data.waterCharge)}</td></tr>`;
		if (data.electricityCharge > 0)
			rows += `<tr><td>Electricity Charge</td><td class="right">${this.formatKES(data.electricityCharge)}</td></tr>`;
		if (data.otherCharges > 0)
			rows += `<tr><td>${this.esc(data.otherChargesDesc || 'Other Charges')}</td><td class="right">${this.formatKES(data.otherCharges)}</td></tr>`;
		if (data.penaltyAmount > 0)
			rows += `<tr><td>Late Payment Penalty</td><td class="right">${this.formatKES(data.penaltyAmount)}</td></tr>`;
		return rows;
	}

	private formatKES(amount: number): string {
		return `KES ${Number(amount).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
	}

	private esc(str: string): string {
		return str
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;');
	}
}
