import { ApiProperty } from '@nestjs/swagger';
import {
	IsArray,
	IsDateString,
	IsEnum,
	IsNumber,
	IsOptional,
	IsString,
	IsUUID,
	Min,
} from 'class-validator';
import { ExpenseCategory, ExpensePriority, ExpenseStatus } from '../entities/expense.entity';

export class UpdateExpenseDto {
	@ApiProperty({ description: 'Expense category', enum: ExpenseCategory, required: false })
	@IsEnum(ExpenseCategory)
	@IsOptional()
	category?: ExpenseCategory;

	@ApiProperty({ description: 'Expense priority', enum: ExpensePriority, required: false })
	@IsEnum(ExpensePriority)
	@IsOptional()
	priority?: ExpensePriority;

	@ApiProperty({ description: 'Description of the expense', required: false })
	@IsString()
	@IsOptional()
	description?: string;

	@ApiProperty({ description: 'Expense amount in KES', required: false })
	@IsNumber()
	@Min(0)
	@IsOptional()
	amount?: number;

	@ApiProperty({ description: 'UUID of the vendor', required: false })
	@IsUUID()
	@IsOptional()
	vendorId?: string;

	@ApiProperty({ description: 'Expense status', enum: ExpenseStatus, required: false })
	@IsEnum(ExpenseStatus)
	@IsOptional()
	status?: ExpenseStatus;

	@ApiProperty({ description: 'Scheduled date (ISO 8601 date string)', required: false })
	@IsDateString()
	@IsOptional()
	scheduledDate?: string;

	@ApiProperty({ description: 'Completed date (ISO 8601 date string)', required: false })
	@IsDateString()
	@IsOptional()
	completedDate?: string;

	@ApiProperty({ description: 'Additional notes', required: false })
	@IsString()
	@IsOptional()
	notes?: string;

	@ApiProperty({ description: 'Array of photo URLs', type: [String], required: false })
	@IsArray()
	@IsString({ each: true })
	@IsOptional()
	photos?: string[];
}
