import {
	Body,
	ClassSerializerInterceptor,
	Controller,
	Get,
	Param,
	ParseIntPipe,
	Post,
	Query,
	UseGuards,
	UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { JwtPayload } from '@/common/interfaces/jwt-payload.interface';
import { TopupWalletDto } from './dto/topup-wallet.dto';
import { WalletService } from './wallet.service';

@Controller('wallet')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@UseInterceptors(ClassSerializerInterceptor)
@ApiBearerAuth('JWT')
@ApiTags('Wallet')
export class WalletController {
	constructor(private readonly walletService: WalletService) {}

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
		);
		const balance = await this.walletService.getBalance(tenant.tenantId);

		return {
			transaction,
			walletBalance: balance.walletBalance,
		};
	}

	@Get(':tenantId')
	@ApiOperation({ summary: 'Get wallet balance for a tenant' })
	async getBalance(@Param('tenantId') tenantId: string) {
		return this.walletService.getBalance(tenantId);
	}

	@Get(':tenantId/transactions')
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
}
