import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from '@/modules/tenants/entities/tenant.entity';
import { AuditModule } from '../audit/audit.module';
import { WalletTransaction } from './entities/wallet-transaction.entity';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { WalletTransactionsRepository } from './wallet-transactions.repository';

@Module({
	imports: [
		TypeOrmModule.forFeature([WalletTransaction, Tenant]),
		AuditModule,
	],
	controllers: [WalletController],
	providers: [WalletService, WalletTransactionsRepository],
	exports: [WalletService],
})
export class WalletModule {}
