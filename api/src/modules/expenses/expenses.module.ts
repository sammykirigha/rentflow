import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { Expense } from './entities/expense.entity';
import { ExpensesController } from './expenses.controller';
import { ExpensesRepository } from './expenses.repository';
import { ExpensesService } from './expenses.service';

@Module({
	imports: [
		TypeOrmModule.forFeature([Expense]),
		AuditModule,
	],
	controllers: [ExpensesController],
	providers: [ExpensesService, ExpensesRepository],
	exports: [ExpensesService, ExpensesRepository],
})
export class ExpensesModule {}
