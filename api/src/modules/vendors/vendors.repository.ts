import { AbstractRepository } from '@/database/abstract.repository';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vendor } from './entities/vendor.entity';

@Injectable()
export class VendorsRepository extends AbstractRepository<Vendor> {
	constructor(
		@InjectRepository(Vendor)
		private readonly vendorRepository: Repository<Vendor>,
	) {
		super(vendorRepository);
	}
}
