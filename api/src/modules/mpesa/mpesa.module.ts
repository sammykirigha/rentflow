import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { WalletModule } from '../wallet/wallet.module';
import { PaymentsModule } from '../payments/payments.module';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Unit } from '../units/entities/unit.entity';
import { Payment } from '../payments/entities/payment.entity';
import { MpesaController } from './mpesa.controller';
import { MpesaService } from './mpesa.service';
import { MpesaIpGuard } from './guards/mpesa-ip.guard';

@Module({
	imports: [
		TypeOrmModule.forFeature([Payment, Tenant, Unit]),
		AuditModule,
		WalletModule,
		PaymentsModule,
		forwardRef(() => InvoicesModule),
	],
	controllers: [MpesaController],
	providers: [MpesaService, MpesaIpGuard],
	exports: [MpesaService],
})
export class MpesaModule {}
