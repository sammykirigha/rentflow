import { AbstractRepository } from '@/database/abstract.repository';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Receipt } from './entities/receipt.entity';

@Injectable()
export class ReceiptsRepository extends AbstractRepository<Receipt> {
	constructor(
		@InjectRepository(Receipt)
		private readonly receiptRepository: Repository<Receipt>,
	) {
		super(receiptRepository);
	}

	createQueryBuilder(alias: string) {
		return this.receiptRepository.createQueryBuilder(alias);
	}
}
