import {
	Body,
	ClassSerializerInterceptor,
	Controller,
	Get,
	Param,
	ParseIntPipe,
	Patch,
	Post,
	Query,
	UseGuards,
	UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Permission, RequirePermissions } from '@/common/decorators/permissions.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { JwtPayload } from '@/common/interfaces/jwt-payload.interface';
import { PermissionAction, PermissionResource } from '@/modules/permissions/entities/permission.entity';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpenseCategory, ExpensePriority, ExpenseStatus } from './entities/expense.entity';
import { ExpensesService } from './expenses.service';

@Controller('expenses')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@UseInterceptors(ClassSerializerInterceptor)
@ApiBearerAuth('JWT')
@ApiTags('Expenses')
export class ExpensesController {
	constructor(private readonly expensesService: ExpensesService) {}

	@Post()
	@RequirePermissions(Permission(PermissionResource.EXPENSES, PermissionAction.CREATE))
	@ApiOperation({ summary: 'Create a new expense' })
	async create(
		@Body() createExpenseDto: CreateExpenseDto,
		@CurrentUser() user: JwtPayload,
	) {
		return this.expensesService.create(createExpenseDto, user.sub);
	}

	@Get()
	@RequirePermissions(Permission(PermissionResource.EXPENSES, PermissionAction.READ))
	@ApiOperation({ summary: 'List expenses with pagination and filters' })
	@ApiQuery({ name: 'page', required: false, type: Number })
	@ApiQuery({ name: 'limit', required: false, type: Number })
	@ApiQuery({ name: 'propertyId', required: false, type: String })
	@ApiQuery({ name: 'category', required: false, enum: ExpenseCategory })
	@ApiQuery({ name: 'status', required: false, enum: ExpenseStatus })
	@ApiQuery({ name: 'priority', required: false, enum: ExpensePriority })
	async findAll(
		@Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
		@Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
		@Query('propertyId') propertyId?: string,
		@Query('category') category?: ExpenseCategory,
		@Query('status') status?: ExpenseStatus,
		@Query('priority') priority?: ExpensePriority,
	) {
		return this.expensesService.findAll({ page, limit, propertyId, category, status, priority });
	}

	@Get(':expenseId')
	@RequirePermissions(Permission(PermissionResource.EXPENSES, PermissionAction.READ))
	@ApiOperation({ summary: 'Get a single expense by ID' })
	async findOne(@Param('expenseId') expenseId: string) {
		return this.expensesService.findOne(expenseId);
	}

	@Patch(':expenseId')
	@RequirePermissions(Permission(PermissionResource.EXPENSES, PermissionAction.UPDATE))
	@ApiOperation({ summary: 'Update an expense' })
	async update(
		@Param('expenseId') expenseId: string,
		@Body() updateExpenseDto: UpdateExpenseDto,
		@CurrentUser() user: JwtPayload,
	) {
		return this.expensesService.update(expenseId, updateExpenseDto, user.sub);
	}
}
