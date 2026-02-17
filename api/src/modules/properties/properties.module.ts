import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { Property } from './entities/property.entity';
import { PropertiesController } from './properties.controller';
import { PropertiesRepository } from './properties.repository';
import { PropertiesService } from './properties.service';

@Module({
	imports: [
		TypeOrmModule.forFeature([Property]),
		AuditModule,
	],
	controllers: [PropertiesController],
	providers: [PropertiesService, PropertiesRepository],
	exports: [PropertiesService, PropertiesRepository],
})
export class PropertiesModule {}
