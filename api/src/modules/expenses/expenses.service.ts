import { AuditAction } from '@/common/enums/audit-action.enum';
import { AuditTargetType } from '@/common/enums/audit-target-type.enum';
import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { Expense, ExpenseCategory, ExpensePriority, ExpenseStatus } from './entities/expense.entity';
import { ExpensesRepository } from './expenses.repository';

@Injectable()
export class ExpensesService {
	constructor(
		private readonly expensesRepository: ExpensesRepository,
		private readonly auditService: AuditService,
		private readonly dataSource: DataSource,
	) {}

	async create(dto: CreateExpenseDto, userId: string): Promise<Expense> {
		const queryRunner = this.dataSource.createQueryRunner();
		await queryRunner.connect();
		await queryRunner.startTransaction();

		let expense: Expense;

		try {
			expense = await queryRunner.manager.save(
				queryRunner.manager.create(Expense, {
					propertyId: dto.propertyId,
					category: dto.category,
					priority: dto.priority ?? ExpensePriority.MEDIUM,
					description: dto.description,
					amount: dto.amount,
					vendorId: dto.vendorId,
					status: ExpenseStatus.PENDING,
					scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : undefined,
					notes: dto.notes,
					photos: dto.photos,
				}),
			);
			await queryRunner.commitTransaction();
		} catch (err) {
			await queryRunner.rollbackTransaction();
			throw err;
		} finally {
			await queryRunner.release();
		}

		await this.auditService.createLog({
			action: AuditAction.EXPENSE_CREATED,
			performedBy: userId,
			targetType: AuditTargetType.EXPENSE,
			targetId: expense.expenseId,
			details: `Created expense "${dto.description}" for property ${dto.propertyId}, amount: ${dto.amount}`,
			metadata: {
				expenseId: expense.expenseId,
				propertyId: dto.propertyId,
				category: dto.category,
				amount: dto.amount,
			},
		});

		return this.expensesRepository.findOne({
			where: { expenseId: expense.expenseId },
			relations: { property: true, vendor: true },
		});
	}

	async findAll({
		page = 1,
		limit = 10,
		propertyId,
		category,
		status,
		priority,
	}: {
		page: number;
		limit: number;
		propertyId?: string;
		category?: ExpenseCategory;
		status?: ExpenseStatus;
		priority?: ExpensePriority;
	}): Promise<{
		data: Expense[];
		pagination: {
			page: number;
			limit: number;
			total: number;
			totalPages: number;
		};
	}> {
		const skip = (page - 1) * limit;

		const queryBuilder = this.expensesRepository
			.createQueryBuilder('expense')
			.leftJoinAndSelect('expense.property', 'property')
			.leftJoinAndSelect('expense.vendor', 'vendor')
			.orderBy('expense.createdAt', 'DESC')
			.skip(skip)
			.take(limit);

		if (propertyId) {
			queryBuilder.andWhere('expense.propertyId = :propertyId', { propertyId });
		}

		if (category) {
			queryBuilder.andWhere('expense.category = :category', { category });
		}

		if (status) {
			queryBuilder.andWhere('expense.status = :status', { status });
		}

		if (priority) {
			queryBuilder.andWhere('expense.priority = :priority', { priority });
		}

		const [expenses, total] = await queryBuilder.getManyAndCount();

		return {
			data: expenses,
			pagination: {
				page,
				limit,
				total,
				totalPages: Math.ceil(total / limit),
			},
		};
	}

	async findOne(expenseId: string): Promise<Expense> {
		const expense = await this.expensesRepository.findOne({
			where: { expenseId },
			relations: { property: true, vendor: true },
		});

		if (!expense) {
			throw new NotFoundException('Expense not found');
		}

		return expense;
	}

	async update(expenseId: string, dto: UpdateExpenseDto, userId: string): Promise<Expense> {
		const expense = await this.findOne(expenseId);

		const updateData: Partial<Expense> = {};

		if (dto.category !== undefined) updateData.category = dto.category;
		if (dto.priority !== undefined) updateData.priority = dto.priority;
		if (dto.description !== undefined) updateData.description = dto.description;
		if (dto.amount !== undefined) updateData.amount = dto.amount;
		if (dto.vendorId !== undefined) updateData.vendorId = dto.vendorId;
		if (dto.status !== undefined) updateData.status = dto.status;
		if (dto.scheduledDate !== undefined) updateData.scheduledDate = new Date(dto.scheduledDate);
		if (dto.completedDate !== undefined) updateData.completedDate = new Date(dto.completedDate);
		if (dto.notes !== undefined) updateData.notes = dto.notes;
		if (dto.photos !== undefined) updateData.photos = dto.photos;

		// Auto-set completedDate when status changes to COMPLETED
		if (dto.status === ExpenseStatus.COMPLETED && !dto.completedDate) {
			updateData.completedDate = new Date();
		}

		const queryRunner = this.dataSource.createQueryRunner();
		await queryRunner.connect();
		await queryRunner.startTransaction();

		try {
			await queryRunner.manager.update(Expense, { expenseId }, updateData as any);
			await queryRunner.commitTransaction();
		} catch (err) {
			await queryRunner.rollbackTransaction();
			throw err;
		} finally {
			await queryRunner.release();
		}

		const auditAction = dto.status === ExpenseStatus.COMPLETED
			? AuditAction.EXPENSE_COMPLETED
			: AuditAction.EXPENSE_UPDATED;

		await this.auditService.createLog({
			action: auditAction,
			performedBy: userId,
			targetType: AuditTargetType.EXPENSE,
			targetId: expenseId,
			details: `Updated expense "${expense.description}" (${expenseId})`,
			metadata: {
				expenseId,
				propertyId: expense.propertyId,
				updatedFields: Object.keys(updateData),
			},
		});

		return this.findOne(expenseId);
	}
}
