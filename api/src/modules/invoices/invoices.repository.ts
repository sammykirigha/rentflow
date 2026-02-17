import { AbstractRepository } from '@/database/abstract.repository';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice } from './entities/invoice.entity';

@Injectable()
export class InvoicesRepository extends AbstractRepository<Invoice> {
	constructor(
		@InjectRepository(Invoice)
		private readonly invoiceRepository: Repository<Invoice>,
	) {
		super(invoiceRepository);
	}

	createQueryBuilder(alias: string) {
		return this.invoiceRepository.createQueryBuilder(alias);
	}
}
