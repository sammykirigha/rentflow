import {
	Body,
	Controller,
	Get,
	Param,
	ParseUUIDPipe,
	Post,
	UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Permission, RequirePermissions } from '@/common/decorators/permissions.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { JwtPayload } from '@/common/interfaces/jwt-payload.interface';
import { PermissionAction, PermissionResource } from '@/modules/permissions/entities/permission.entity';
import { WalletService } from '@/modules/wallet/wallet.service';
import { AdminInitiateStkPushDto } from './dto/admin-initiate-stk-push.dto';
import { InitiateStkPushDto } from './dto/initiate-stk-push.dto';
import { MpesaIpGuard } from './guards/mpesa-ip.guard';
import { MpesaService } from './mpesa.service';

@Controller('payments/mobile')
@ApiTags('M-Pesa')
export class MpesaController {
	constructor(
		private readonly mpesaService: MpesaService,
		private readonly walletService: WalletService,
	) {}

	// ── Authenticated Endpoints ─────────────────────────────

	@Post('register-c2b')
	@UseGuards(JwtAuthGuard, PermissionsGuard)
	@ApiBearerAuth('JWT')
	@ApiOperation({ summary: 'Manually register C2B callback URLs with Safaricom' })
	async registerC2bUrls() {
		await this.mpesaService.registerC2bUrls();
		return { success: true, message: 'C2B URLs registered successfully' };
	}

	@Post('stk-push')
	@UseGuards(JwtAuthGuard, PermissionsGuard)
	@Throttle(3, 3600000)
	@ApiBearerAuth('JWT')
	@ApiOperation({ summary: 'Initiate M-Pesa STK Push for wallet top-up' })
	async initiateStkPush(
		@Body() dto: InitiateStkPushDto,
		@CurrentUser() user: JwtPayload,
	) {
		const tenant = await this.walletService.findTenantByUserId(user.sub);
		return this.mpesaService.initiateStkPush(
			tenant.tenantId,
			dto.amount,
			dto.phoneNumber,
		);
	}

	@Get('stk-status/:paymentId')
	@UseGuards(JwtAuthGuard, PermissionsGuard)
	@ApiBearerAuth('JWT')
	@ApiOperation({ summary: 'Check STK Push payment status' })
	async getStkStatus(
		@Param('paymentId', ParseUUIDPipe) paymentId: string,
		@CurrentUser() user: JwtPayload,
	) {
		const tenant = await this.walletService.findTenantByUserId(user.sub);
		return this.mpesaService.getStkStatus(paymentId, tenant.tenantId);
	}

	// ── Admin Endpoints (Landlord/Manager) ──────────────────

	@Post('admin/stk-push')
	@UseGuards(JwtAuthGuard, PermissionsGuard)
	@RequirePermissions(Permission(PermissionResource.PAYMENTS, PermissionAction.CREATE))
	@Throttle(10, 3600000)
	@ApiBearerAuth('JWT')
	@ApiOperation({ summary: 'Initiate M-Pesa STK Push on behalf of a tenant (admin)' })
	async adminInitiateStkPush(
		@Body() dto: AdminInitiateStkPushDto,
		@CurrentUser() user: JwtPayload,
	) {
		return this.mpesaService.initiateStkPush(
			dto.tenantId,
			dto.amount,
			dto.phoneNumber,
		);
	}

	@Get('admin/stk-status/:paymentId')
	@UseGuards(JwtAuthGuard, PermissionsGuard)
	@RequirePermissions(Permission(PermissionResource.PAYMENTS, PermissionAction.READ))
	@ApiBearerAuth('JWT')
	@ApiOperation({ summary: 'Check STK Push payment status (admin)' })
	async adminGetStkStatus(
		@Param('paymentId', ParseUUIDPipe) paymentId: string,
	) {
		return this.mpesaService.getStkStatusAdmin(paymentId);
	}

	// ── Daraja Callback Endpoints (Public + IP Guarded) ─────

	@Post('callback/stk')
	@Public()
	@SkipThrottle()
	@UseGuards(MpesaIpGuard)
	@ApiOperation({ summary: 'M-Pesa STK Push callback (Daraja)' })
	async stkCallback(@Body() body: any) {
		// Return immediately to Daraja, process asynchronously
		const result = await this.mpesaService.handleStkCallback(body);
		return result;
	}

	@Post('callback/validation')
	@Public()
	@SkipThrottle()
	@UseGuards(MpesaIpGuard)
	@ApiOperation({ summary: 'M-Pesa C2B validation callback (Daraja)' })
	async c2bValidation(@Body() body: any) {
		return this.mpesaService.handleC2bValidation(body);
	}

	@Post('callback/confirmation')
	@Public()
	@SkipThrottle()
	@UseGuards(MpesaIpGuard)
	@ApiOperation({ summary: 'M-Pesa C2B confirmation callback (Daraja)' })
	async c2bConfirmation(@Body() body: any) {
		return this.mpesaService.handleC2bConfirmation(body);
	}
}
