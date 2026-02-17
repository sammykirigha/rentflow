import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { Vendor } from './entities/vendor.entity';
import { VendorsController } from './vendors.controller';
import { VendorsRepository } from './vendors.repository';
import { VendorsService } from './vendors.service';

@Module({
	imports: [
		TypeOrmModule.forFeature([Vendor]),
		AuditModule,
	],
	controllers: [VendorsController],
	providers: [VendorsService, VendorsRepository],
	exports: [VendorsService, VendorsRepository],
})
export class VendorsModule {}
