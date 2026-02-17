import {
	ExpenseCategory,
	ExpensePriority,
} from '@/modules/expenses/entities/expense.entity';
import { ApiProperty } from '@nestjs/swagger';
import {
	IsArray,
	IsEnum,
	IsNotEmpty,
	IsOptional,
	IsString,
	IsUUID,
} from 'class-validator';

export class CreateMaintenanceRequestDto {
	@ApiProperty({ description: 'UUID of the tenant', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
	@IsUUID()
	@IsNotEmpty()
	tenantId: string;

	@ApiProperty({ description: 'Description of the maintenance issue', example: 'Leaking kitchen faucet' })
	@IsString()
	@IsNotEmpty()
	description: string;

	@ApiProperty({ description: 'Category of maintenance request', enum: ExpenseCategory, example: ExpenseCategory.PLUMBING })
	@IsEnum(ExpenseCategory)
	@IsNotEmpty()
	category: ExpenseCategory;

	@ApiProperty({ description: 'Priority level', enum: ExpensePriority, example: ExpensePriority.MEDIUM, required: false })
	@IsEnum(ExpensePriority)
	@IsOptional()
	priority?: ExpensePriority;

	@ApiProperty({ description: 'Array of photo URLs', example: ['https://storage.example.com/photo1.jpg'], required: false })
	@IsArray()
	@IsString({ each: true })
	@IsOptional()
	photos?: string[];
}
