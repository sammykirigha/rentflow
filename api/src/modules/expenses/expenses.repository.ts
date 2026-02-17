import { AbstractRepository } from '@/database/abstract.repository';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Expense } from './entities/expense.entity';

@Injectable()
export class ExpensesRepository extends AbstractRepository<Expense> {
	constructor(
		@InjectRepository(Expense)
		private readonly expenseRepository: Repository<Expense>,
	) {
		super(expenseRepository);
	}

	createQueryBuilder(alias: string) {
		return this.expenseRepository.createQueryBuilder(alias);
	}
}
