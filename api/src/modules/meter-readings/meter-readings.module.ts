import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrgContextModule } from '@/common/services/org-context.module';
import { AuditModule } from '@/modules/audit/audit.module';
import { MeterReading } from './entities/meter-reading.entity';
import { MeterReadingsController } from './meter-readings.controller';
import { MeterReadingsService } from './meter-readings.service';

@Module({
	imports: [
		TypeOrmModule.forFeature([MeterReading]),
		OrgContextModule,
		AuditModule,
	],
	controllers: [MeterReadingsController],
	providers: [MeterReadingsService],
	exports: [MeterReadingsService],
})
export class MeterReadingsModule {}
