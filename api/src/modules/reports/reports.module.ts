import { Module } from '@nestjs/common';
import { OrgContextModule } from '@/common/services/org-context.module';
import { AuditModule } from '@/modules/audit/audit.module';
import { PdfModule } from '@/modules/pdf/pdf.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
	imports: [OrgContextModule, AuditModule, PdfModule],
	controllers: [ReportsController],
	providers: [ReportsService],
	exports: [ReportsService],
})
export class ReportsModule {}
