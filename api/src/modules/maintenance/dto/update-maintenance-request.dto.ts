import {
	ExpenseCategory,
	ExpensePriority,
	ExpenseStatus,
} from '@/modules/expenses/entities/expense.entity';
import { ApiProperty } from '@nestjs/swagger';
import {
	IsArray,
	IsDateString,
	IsEnum,
	IsOptional,
	IsString,
} from 'class-validator';

export class UpdateMaintenanceRequestDto {
	@ApiProperty({ description: 'Description of the maintenance issue', required: false })
	@IsString()
	@IsOptional()
	description?: string;

	@ApiProperty({ description: 'Category of maintenance request', enum: ExpenseCategory, required: false })
	@IsEnum(ExpenseCategory)
	@IsOptional()
	category?: ExpenseCategory;

	@ApiProperty({ description: 'Priority level', enum: ExpensePriority, required: false })
	@IsEnum(ExpensePriority)
	@IsOptional()
	priority?: ExpensePriority;

	@ApiProperty({ description: 'Array of photo URLs', required: false })
	@IsArray()
	@IsString({ each: true })
	@IsOptional()
	photos?: string[];

	@ApiProperty({ description: 'Status of the maintenance request', enum: ExpenseStatus, required: false })
	@IsEnum(ExpenseStatus)
	@IsOptional()
	status?: ExpenseStatus;

	@ApiProperty({ description: 'Timestamp when the request was resolved (ISO 8601)', required: false })
	@IsDateString()
	@IsOptional()
	resolvedAt?: string;
}
