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
	ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Permission, RequirePermissions } from '@/common/decorators/permissions.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { JwtPayload } from '@/common/interfaces/jwt-payload.interface';
import { PermissionAction, PermissionResource } from '@/modules/permissions/entities/permission.entity';
import { WalletService } from '@/modules/wallet/wallet.service';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { ReconcilePaymentDto } from './dto/reconcile-payment.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@UseInterceptors(ClassSerializerInterceptor)
@ApiBearerAuth('JWT')
@ApiTags('Payments')
export class PaymentsController {
	constructor(
		private readonly paymentsService: PaymentsService,
		private readonly walletService: WalletService,
	) {}

	@Post()
	@RequirePermissions(Permission(PermissionResource.PAYMENTS, PermissionAction.CREATE))
	@ApiOperation({ summary: 'Record a new payment' })
	async recordPayment(
		@Body() recordPaymentDto: RecordPaymentDto,
		@CurrentUser() user: JwtPayload,
	) {
		return this.paymentsService.recordPayment(recordPaymentDto, user.sub);
	}

	@Get()
	@RequirePermissions(Permission(PermissionResource.PAYMENTS, PermissionAction.READ))
	@ApiOperation({ summary: 'List payments with pagination and filters' })
	@ApiQuery({ name: 'page', required: false, type: Number })
	@ApiQuery({ name: 'limit', required: false, type: Number })
	@ApiQuery({ name: 'tenantId', required: false, type: String })
	@ApiQuery({ name: 'invoiceId', required: false, type: String })
	async findAll(
		@Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
		@Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
		@Query('tenantId') tenantId?: string,
		@Query('invoiceId') invoiceId?: string,
	) {
		return this.paymentsService.findAll({ page, limit, tenantId, invoiceId });
	}

	@Get('my')
	@ApiOperation({ summary: 'Get payments for the currently logged-in tenant' })
	@ApiQuery({ name: 'page', required: false, type: Number })
	@ApiQuery({ name: 'limit', required: false, type: Number })
	async findMyPayments(
		@CurrentUser() user: JwtPayload,
		@Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
		@Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
	) {
		const tenant = await this.walletService.findTenantByUserId(user.sub);
		return this.paymentsService.findByTenant(tenant.tenantId, { page, limit });
	}

	@Get('reconciliation-queue')
	@RequirePermissions(Permission(PermissionResource.PAYMENTS, PermissionAction.READ))
	@ApiOperation({ summary: 'List payments that need reconciliation' })
	@ApiQuery({ name: 'page', required: false, type: Number })
	@ApiQuery({ name: 'limit', required: false, type: Number })
	async findUnreconciled(
		@Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
		@Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
	) {
		return this.paymentsService.findUnreconciled({ page, limit });
	}

	@Get('tenant/:tenantId')
	@RequirePermissions(Permission(PermissionResource.PAYMENTS, PermissionAction.READ))
	@ApiOperation({ summary: 'Get payments for a specific tenant' })
	@ApiQuery({ name: 'page', required: false, type: Number })
	@ApiQuery({ name: 'limit', required: false, type: Number })
	async findByTenant(
		@Param('tenantId') tenantId: string,
		@Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
		@Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
	) {
		return this.paymentsService.findByTenant(tenantId, { page, limit });
	}

	@Post(':paymentId/reconcile')
	@RequirePermissions(Permission(PermissionResource.PAYMENTS, PermissionAction.UPDATE))
	@ApiOperation({ summary: 'Reconcile an unmatched payment by assigning it to a tenant' })
	async reconcilePayment(
		@Param('paymentId', ParseUUIDPipe) paymentId: string,
		@Body() dto: ReconcilePaymentDto,
		@CurrentUser() user: JwtPayload,
	) {
		return this.paymentsService.reconcilePayment(paymentId, dto, user.sub);
	}
}
