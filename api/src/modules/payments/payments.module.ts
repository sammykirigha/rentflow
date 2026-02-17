import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { Payment } from './entities/payment.entity';
import { PaymentsController } from './payments.controller';
import { PaymentsRepository } from './payments.repository';
import { PaymentsService } from './payments.service';

@Module({
	imports: [
		TypeOrmModule.forFeature([Payment]),
		AuditModule,
		forwardRef(() => InvoicesModule),
	],
	controllers: [PaymentsController],
	providers: [PaymentsService, PaymentsRepository],
	exports: [PaymentsService, PaymentsRepository],
})
export class PaymentsModule {}
