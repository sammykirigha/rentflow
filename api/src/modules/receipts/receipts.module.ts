import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PdfModule } from '../pdf/pdf.module';
import { SettingsModule } from '../settings/settings.module';
import { Receipt } from './entities/receipt.entity';
import { ReceiptsController } from './receipts.controller';
import { ReceiptsRepository } from './receipts.repository';
import { ReceiptsService } from './receipts.service';

@Module({
	imports: [
		TypeOrmModule.forFeature([Receipt]),
		PdfModule,
		SettingsModule,
	],
	controllers: [ReceiptsController],
	providers: [ReceiptsRepository, ReceiptsService],
	exports: [ReceiptsRepository, ReceiptsService],
})
export class ReceiptsModule {}
