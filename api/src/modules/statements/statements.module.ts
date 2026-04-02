import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice } from '@/modules/invoices/entities/invoice.entity';
import { Notification } from '@/modules/notifications/entities/notification.entity';
import { Organization } from '@/modules/organizations/entities/organization.entity';
import { Payment } from '@/modules/payments/entities/payment.entity';
import { Tenant } from '@/modules/tenants/entities/tenant.entity';
import { WalletTransaction } from '@/modules/wallet/entities/wallet-transaction.entity';
import { OrgContextModule } from '@/common/services/org-context.module';
import { AuditModule } from '@/modules/audit/audit.module';
import { MailModule } from '@/modules/mail/mail.module';
import { PdfModule } from '@/modules/pdf/pdf.module';
import { SettingsModule } from '@/modules/settings/settings.module';
import { StatementsController } from './statements.controller';
import { StatementsService } from './statements.service';

@Module({
	imports: [
		TypeOrmModule.forFeature([Tenant, Invoice, Payment, WalletTransaction, Notification, Organization]),
		OrgContextModule,
		AuditModule,
		MailModule,
		PdfModule,
		forwardRef(() => SettingsModule),
	],
	controllers: [StatementsController],
	providers: [StatementsService],
	exports: [StatementsService],
})
export class StatementsModule {}
