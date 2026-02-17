import {
	ClassSerializerInterceptor,
	Controller,
	Get,
	Param,
	ParseIntPipe,
	Query,
	Res,
	UseGuards,
	UseInterceptors,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { ReceiptsService } from './receipts.service';

@Controller('receipts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@UseInterceptors(ClassSerializerInterceptor)
@ApiBearerAuth('JWT')
@ApiTags('Receipts')
export class ReceiptsController {
	constructor(private readonly receiptsService: ReceiptsService) {}

	@Get()
	@ApiOperation({ summary: 'List receipts with pagination' })
	@ApiQuery({ name: 'page', required: false, type: Number })
	@ApiQuery({ name: 'limit', required: false, type: Number })
	async findAll(
		@Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
		@Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
	) {
		return this.receiptsService.findAll({ page, limit });
	}

	@Get(':receiptId/pdf')
	@ApiOperation({ summary: 'Download receipt as PDF' })
	async downloadPdf(
		@Param('receiptId') receiptId: string,
		@Res() res: Response,
	) {
		const { buffer, filename } = await this.receiptsService.generateReceiptPdf(receiptId);

		res.set({
			'Content-Type': 'application/pdf',
			'Content-Disposition': `attachment; filename="${filename}"`,
			'Content-Length': buffer.length,
		});
		res.end(buffer);
	}

	@Get(':receiptId')
	@ApiOperation({ summary: 'Get a single receipt by ID' })
	async findOne(@Param('receiptId') receiptId: string) {
		return this.receiptsService.findOne(receiptId);
	}
}
