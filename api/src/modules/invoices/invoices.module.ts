import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from '@/modules/tenants/entities/tenant.entity';
import { WalletTransaction } from '@/modules/wallet/entities/wallet-transaction.entity';
import { Receipt } from '@/modules/receipts/entities/receipt.entity';
import { Notification } from '@/modules/notifications/entities/notification.entity';
import { AuditModule } from '../audit/audit.module';
import { SmsModule } from '../sms/sms.module';
import { MailModule } from '../mail/mail.module';
import { WalletModule } from '../wallet/wallet.module';
import { PdfModule } from '../pdf/pdf.module';
import { SettingsModule } from '../settings/settings.module';
import { Invoice } from './entities/invoice.entity';
import { InvoiceEngineService } from './invoice-engine.service';
import { InvoicesController } from './invoices.controller';
import { InvoicesRepository } from './invoices.repository';
import { InvoicesService } from './invoices.service';
import { PenaltyEngineService } from './penalty-engine.service';
import { ReminderService } from './reminder.service';
import { WalletSettlementService } from './wallet-settlement.service';

@Module({
	imports: [
		TypeOrmModule.forFeature([Invoice, Tenant, WalletTransaction, Receipt, Notification]),
		AuditModule,
		SmsModule,
		MailModule,
		WalletModule,
		PdfModule,
		SettingsModule,
	],
	controllers: [InvoicesController],
	providers: [InvoicesService, InvoicesRepository, InvoiceEngineService, PenaltyEngineService, ReminderService, WalletSettlementService],
	exports: [InvoicesService, InvoicesRepository, InvoiceEngineService, PenaltyEngineService, ReminderService, WalletSettlementService],
})
export class InvoicesModule {}
