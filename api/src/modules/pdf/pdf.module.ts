import { Module } from '@nestjs/common';
import { PdfService } from './pdf.service';
import { StorageModule } from '../storage/storage.module';

@Module({
	imports: [StorageModule],
	providers: [PdfService],
	exports: [PdfService],
})
export class PdfModule {}
