import {
	Body,
	ClassSerializerInterceptor,
	Controller,
	Get,
	Header,
	Param,
	ParseIntPipe,
	Patch,
	Post,
	Query,
	Res,
	UseGuards,
	UseInterceptors,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { JwtPayload } from '@/common/interfaces/jwt-payload.interface';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoiceStatus } from './entities/invoice.entity';
import { InvoicesService } from './invoices.service';

@Controller('invoices')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@UseInterceptors(ClassSerializerInterceptor)
@ApiBearerAuth('JWT')
@ApiTags('Invoices')
export class InvoicesController {
	constructor(private readonly invoicesService: InvoicesService) {}

	@Post()
	@ApiOperation({ summary: 'Create a new invoice' })
	async create(
		@Body() createInvoiceDto: CreateInvoiceDto,
		@CurrentUser() user: JwtPayload,
	) {
		return this.invoicesService.create(createInvoiceDto, user.sub);
	}

	@Get()
	@ApiOperation({ summary: 'List invoices with pagination and filters' })
	@ApiQuery({ name: 'page', required: false, type: Number })
	@ApiQuery({ name: 'limit', required: false, type: Number })
	@ApiQuery({ name: 'tenantId', required: false, type: String })
	@ApiQuery({ name: 'status', required: false, enum: InvoiceStatus })
	@ApiQuery({ name: 'billingMonth', required: false, type: String })
	async findAll(
		@Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
		@Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
		@Query('tenantId') tenantId?: string,
		@Query('status') status?: InvoiceStatus,
		@Query('billingMonth') billingMonth?: string,
	) {
		return this.invoicesService.findAll({ page, limit, tenantId, status, billingMonth });
	}

	@Get('tenant/:tenantId')
	@ApiOperation({ summary: 'Get invoices for a specific tenant' })
	@ApiQuery({ name: 'page', required: false, type: Number })
	@ApiQuery({ name: 'limit', required: false, type: Number })
	async findByTenant(
		@Param('tenantId') tenantId: string,
		@Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
		@Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
	) {
		return this.invoicesService.findByTenant(tenantId, { page, limit });
	}

	@Get(':invoiceId/pdf')
	@ApiOperation({ summary: 'Download invoice as PDF' })
	async downloadPdf(
		@Param('invoiceId') invoiceId: string,
		@Res() res: Response,
	) {
		const { buffer, filename } = await this.invoicesService.generateInvoicePdf(invoiceId);

		res.set({
			'Content-Type': 'application/pdf',
			'Content-Disposition': `attachment; filename="${filename}"`,
			'Content-Length': buffer.length,
		});
		res.end(buffer);
	}

	@Get(':invoiceId')
	@ApiOperation({ summary: 'Get a single invoice by ID' })
	async findOne(@Param('invoiceId') invoiceId: string) {
		return this.invoicesService.findOne(invoiceId);
	}

	@Patch(':invoiceId')
	@ApiOperation({ summary: 'Update an invoice' })
	async update(
		@Param('invoiceId') invoiceId: string,
		@Body() updateInvoiceDto: UpdateInvoiceDto,
		@CurrentUser() user: JwtPayload,
	) {
		return this.invoicesService.update(invoiceId, updateInvoiceDto, user.sub);
	}
}
