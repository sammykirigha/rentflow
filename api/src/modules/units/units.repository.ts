import { AbstractRepository } from '@/database/abstract.repository';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Unit } from './entities/unit.entity';

@Injectable()
export class UnitsRepository extends AbstractRepository<Unit> {
	constructor(
		@InjectRepository(Unit)
		private readonly unitRepository: Repository<Unit>,
	) {
		super(unitRepository);
	}
}
