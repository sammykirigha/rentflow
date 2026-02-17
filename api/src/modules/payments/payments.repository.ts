import { AbstractRepository } from '@/database/abstract.repository';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';

@Injectable()
export class PaymentsRepository extends AbstractRepository<Payment> {
	constructor(
		@InjectRepository(Payment)
		private readonly paymentRepository: Repository<Payment>,
	) {
		super(paymentRepository);
	}

	createQueryBuilder(alias: string) {
		return this.paymentRepository.createQueryBuilder(alias);
	}
}
