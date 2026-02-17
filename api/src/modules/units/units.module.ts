import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { Unit } from './entities/unit.entity';
import { UnitsController } from './units.controller';
import { UnitsRepository } from './units.repository';
import { UnitsService } from './units.service';

@Module({
	imports: [
		TypeOrmModule.forFeature([Unit]),
		AuditModule,
	],
	controllers: [UnitsController],
	providers: [UnitsService, UnitsRepository],
	exports: [UnitsService, UnitsRepository],
})
export class UnitsModule {}
