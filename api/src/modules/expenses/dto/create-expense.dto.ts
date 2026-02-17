import { ApiProperty } from '@nestjs/swagger';
import {
	IsArray,
	IsDateString,
	IsEnum,
	IsNotEmpty,
	IsNumber,
	IsOptional,
	IsString,
	IsUUID,
	Min,
} from 'class-validator';
import { ExpenseCategory, ExpensePriority } from '../entities/expense.entity';

export class CreateExpenseDto {
	@ApiProperty({ description: 'UUID of the property', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
	@IsUUID()
	@IsNotEmpty()
	propertyId: string;

	@ApiProperty({ description: 'Expense category', enum: ExpenseCategory, example: ExpenseCategory.PLUMBING })
	@IsEnum(ExpenseCategory)
	@IsNotEmpty()
	category: ExpenseCategory;

	@ApiProperty({ description: 'Expense priority', enum: ExpensePriority, example: ExpensePriority.MEDIUM, required: false })
	@IsEnum(ExpensePriority)
	@IsOptional()
	priority?: ExpensePriority;

	@ApiProperty({ description: 'Description of the expense', example: 'Fix broken pipe in unit A-101' })
	@IsString()
	@IsNotEmpty()
	description: string;

	@ApiProperty({ description: 'Expense amount in KES', example: 15000 })
	@IsNumber()
	@Min(0)
	@IsNotEmpty()
	amount: number;

	@ApiProperty({ description: 'UUID of the vendor', example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901', required: false })
	@IsUUID()
	@IsOptional()
	vendorId?: string;

	@ApiProperty({ description: 'Scheduled date (ISO 8601 date string)', example: '2026-02-20T00:00:00.000Z', required: false })
	@IsDateString()
	@IsOptional()
	scheduledDate?: string;

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
