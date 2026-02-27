import {
	Body,
	ClassSerializerInterceptor,
	Controller,
	Get,
	Param,
	ParseIntPipe,
	Post,
	Query,
	Res,
	UseGuards,
	UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Permission, RequirePermissions } from '@/common/decorators/permissions.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { JwtPayload } from '@/common/interfaces/jwt-payload.interface';
import { PermissionAction, PermissionResource } from '@/modules/permissions/entities/permission.entity';
import { PdfService } from '../pdf/pdf.service';
import { SettingsService } from '../settings/settings.service';
import { TopupWalletDto } from './dto/topup-wallet.dto';
import { WalletTxnType } from './entities/wallet-transaction.entity';
import { WalletService } from './wallet.service';

const WALLET_TXN_TYPE_LABEL: Record<string, string> = {
	credit: 'Credit',
	credit_reconciliation: 'Reconciled Payment',
	debit_invoice: 'Invoice Deduction',
	debit_penalty: 'Penalty Deduction',
	refund: 'Refund',
};

@Controller('wallet')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@UseInterceptors(ClassSerializerInterceptor)
@ApiBearerAuth('JWT')
@ApiTags('Wallet')
export class WalletController {
	constructor(
		private readonly walletService: WalletService,
		private readonly pdfService: PdfService,
		private readonly settingsService: SettingsService,
	) {}

	@Get('my-balance')
	@ApiOperation({ summary: 'Get current tenant wallet balance (using JWT user)' })
	async getMyBalance(@CurrentUser() user: JwtPayload) {
		const tenant = await this.walletService.findTenantByUserId(user.sub);
		return this.walletService.getBalance(tenant.tenantId);
	}

	@Get('my-transactions')
	@ApiOperation({ summary: 'Get current tenant wallet transactions (using JWT user)' })
	@ApiQuery({ name: 'page', required: false, type: Number })
	@ApiQuery({ name: 'limit', required: false, type: Number })
	async getMyTransactions(
		@CurrentUser() user: JwtPayload,
		@Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
		@Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
	) {
		const tenant = await this.walletService.findTenantByUserId(user.sub);
		return this.walletService.getTransactions(tenant.tenantId, { page, limit });
	}

	@Get('my-statement')
	@ApiOperation({ summary: 'Download wallet statement PDF (using JWT user)' })
	@ApiQuery({ name: 'startDate', required: false, type: String })
	@ApiQuery({ name: 'endDate', required: false, type: String })
	async getMyStatement(
		@CurrentUser() user: JwtPayload,
		@Query('startDate') startDate?: string,
		@Query('endDate') endDate?: string,
		@Res() res?: Response,
	) {
		const tenant = await this.walletService.findTenantByUserId(user.sub);

		const { tenant: tenantData, transactions, openingBalance, closingBalance, totalCredits, totalDebits } =
			await this.walletService.getStatementData(tenant.tenantId, { startDate, endDate });

		const settings = await this.settingsService.getSettings();

		const tenantUser = tenantData.user;
		const unit = tenantData.unit;
		const property = unit?.property;
		const tenantName = tenantUser
			? `${tenantUser.firstName || ''} ${tenantUser.lastName || ''}`.trim()
			: 'Tenant';

		const displayStartDate = startDate
			? new Date(startDate).toLocaleDateString('en-KE')
			: 'All time';
		const displayEndDate = endDate
			? new Date(endDate).toLocaleDateString('en-KE')
			: new Date().toLocaleDateString('en-KE');

		const buffer = await this.pdfService.generateStatementPdf({
			companyName: settings.platformName || 'RentFlow',
			companyEmail: settings.supportEmail || 'support@rentflow.co.ke',
			companyPhone: settings.contactPhone || undefined,
			companyAddress: settings.contactAddress || undefined,
			companyLogoUrl: settings.appLogo || undefined,

			tenantName,
			tenantPhone: tenantUser?.phone || '',
			tenantEmail: tenantUser?.email || '',
			unitNumber: unit?.unitNumber || '',
			propertyName: property?.name || '',

			startDate: displayStartDate,
			endDate: displayEndDate,

			openingBalance,
			closingBalance,
			totalCredits,
			totalDebits,

			transactions: transactions.map((txn) => ({
				date: new Date(txn.createdAt).toLocaleDateString('en-KE'),
				type: WALLET_TXN_TYPE_LABEL[txn.type] || txn.type,
				description: txn.description || '',
				reference: txn.reference || '',
				debit:
					txn.type === WalletTxnType.DEBIT_INVOICE || txn.type === WalletTxnType.DEBIT_PENALTY
						? Number(txn.amount)
						: 0,
				credit:
					txn.type === WalletTxnType.CREDIT || txn.type === WalletTxnType.CREDIT_RECONCILIATION || txn.type === WalletTxnType.REFUND
						? Number(txn.amount)
						: 0,
				balance: Number(txn.balanceAfter),
			})),
		});

		const filename = `statement-${unit?.unitNumber || tenant.tenantId}.pdf`;
		res.set({
			'Content-Type': 'application/pdf',
			'Content-Disposition': `attachment; filename="${filename}"`,
			'Content-Length': buffer.length,
		});
		res.end(buffer);
	}

	@Post('topup')
	@ApiOperation({ summary: 'Top up wallet balance (tenant self-service)' })
	async topup(
		@CurrentUser() user: JwtPayload,
		@Body() dto: TopupWalletDto,
	) {
		const tenant = await this.walletService.findTenantByUserId(user.sub);
		const transaction = await this.walletService.credit(
			tenant.tenantId,
			dto.amount,
			dto.mpesaReceiptNumber,
			'Wallet top-up',
			user.sub,
		);
		const balance = await this.walletService.getBalance(tenant.tenantId);

		return {
			transaction,
			walletBalance: balance.walletBalance,
		};
	}

	@Get('ledger')
	@RequirePermissions(Permission(PermissionResource.WALLET, PermissionAction.READ))
	@ApiOperation({ summary: 'Get wallet ledger across all tenants' })
	@ApiQuery({ name: 'page', required: false, type: Number })
	@ApiQuery({ name: 'limit', required: false, type: Number })
	@ApiQuery({ name: 'tenantId', required: false, type: String })
	@ApiQuery({ name: 'type', required: false, enum: WalletTxnType })
	@ApiQuery({ name: 'startDate', required: false, type: String })
	@ApiQuery({ name: 'endDate', required: false, type: String })
	async getLedger(
		@Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
		@Query('limit', new ParseIntPipe({ optional: true })) limit: number = 20,
		@Query('tenantId') tenantId?: string,
		@Query('type') type?: WalletTxnType,
		@Query('startDate') startDate?: string,
		@Query('endDate') endDate?: string,
	) {
		return this.walletService.getLedger({ page, limit, tenantId, type, startDate, endDate });
	}

	@Get(':tenantId')
	@RequirePermissions(Permission(PermissionResource.WALLET, PermissionAction.READ))
	@ApiOperation({ summary: 'Get wallet balance for a tenant' })
	async getBalance(@Param('tenantId') tenantId: string) {
		return this.walletService.getBalance(tenantId);
	}

	@Get(':tenantId/transactions')
	@RequirePermissions(Permission(PermissionResource.WALLET, PermissionAction.READ))
	@ApiOperation({ summary: 'Get wallet transactions for a tenant' })
	@ApiQuery({ name: 'page', required: false, type: Number })
	@ApiQuery({ name: 'limit', required: false, type: Number })
	async getTransactions(
		@Param('tenantId') tenantId: string,
		@Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
		@Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
	) {
		return this.walletService.getTransactions(tenantId, { page, limit });
	}

	@Get(':tenantId/statement')
	@RequirePermissions(Permission(PermissionResource.WALLET, PermissionAction.READ))
	@ApiOperation({ summary: 'Download wallet statement PDF for a tenant' })
	@ApiQuery({ name: 'startDate', required: false, type: String })
	@ApiQuery({ name: 'endDate', required: false, type: String })
	async getStatement(
		@Param('tenantId') tenantId: string,
		@Query('startDate') startDate?: string,
		@Query('endDate') endDate?: string,
		@Res() res?: Response,
	) {
		const { tenant, transactions, openingBalance, closingBalance, totalCredits, totalDebits } =
			await this.walletService.getStatementData(tenantId, { startDate, endDate });

		const settings = await this.settingsService.getSettings();

		const user = tenant.user;
		const unit = tenant.unit;
		const property = unit?.property;
		const tenantName = user
			? `${user.firstName || ''} ${user.lastName || ''}`.trim()
			: 'Tenant';

		const displayStartDate = startDate
			? new Date(startDate).toLocaleDateString('en-KE')
			: 'All time';
		const displayEndDate = endDate
			? new Date(endDate).toLocaleDateString('en-KE')
			: new Date().toLocaleDateString('en-KE');

		const buffer = await this.pdfService.generateStatementPdf({
			companyName: settings.platformName || 'RentFlow',
			companyEmail: settings.supportEmail || 'support@rentflow.co.ke',
			companyPhone: settings.contactPhone || undefined,
			companyAddress: settings.contactAddress || undefined,
			companyLogoUrl: settings.appLogo || undefined,

			tenantName,
			tenantPhone: user?.phone || '',
			tenantEmail: user?.email || '',
			unitNumber: unit?.unitNumber || '',
			propertyName: property?.name || '',

			startDate: displayStartDate,
			endDate: displayEndDate,

			openingBalance,
			closingBalance,
			totalCredits,
			totalDebits,

			transactions: transactions.map((txn) => ({
				date: new Date(txn.createdAt).toLocaleDateString('en-KE'),
				type: WALLET_TXN_TYPE_LABEL[txn.type] || txn.type,
				description: txn.description || '',
				reference: txn.reference || '',
				debit:
					txn.type === WalletTxnType.DEBIT_INVOICE || txn.type === WalletTxnType.DEBIT_PENALTY
						? Number(txn.amount)
						: 0,
				credit:
					txn.type === WalletTxnType.CREDIT || txn.type === WalletTxnType.CREDIT_RECONCILIATION || txn.type === WalletTxnType.REFUND
						? Number(txn.amount)
						: 0,
				balance: Number(txn.balanceAfter),
			})),
		});

		const filename = `statement-${unit?.unitNumber || tenantId}.pdf`;
		res.set({
			'Content-Type': 'application/pdf',
			'Content-Disposition': `attachment; filename="${filename}"`,
			'Content-Length': buffer.length,
		});
		res.end(buffer);
	}
}
