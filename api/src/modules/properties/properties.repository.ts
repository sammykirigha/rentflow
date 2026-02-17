import { AbstractRepository } from '@/database/abstract.repository';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Property } from './entities/property.entity';

@Injectable()
export class PropertiesRepository extends AbstractRepository<Property> {
	constructor(
		@InjectRepository(Property)
		private readonly propertyRepository: Repository<Property>,
	) {
		super(propertyRepository);
	}
}
