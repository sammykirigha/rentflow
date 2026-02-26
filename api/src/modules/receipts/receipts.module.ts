import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PdfModule } from '../pdf/pdf.module';
import { SettingsModule } from '../settings/settings.module';
import { WalletModule } from '../wallet/wallet.module';
import { Receipt } from './entities/receipt.entity';
import { ReceiptsController } from './receipts.controller';
import { ReceiptsRepository } from './receipts.repository';
import { ReceiptsService } from './receipts.service';

@Module({
	imports: [
		TypeOrmModule.forFeature([Receipt]),
		PdfModule,
		SettingsModule,
		WalletModule,
	],
	controllers: [ReceiptsController],
	providers: [ReceiptsRepository, ReceiptsService],
	exports: [ReceiptsRepository, ReceiptsService],
})
export class ReceiptsModule {}
