import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
	constructor(private readonly reportsService: ReportsService) {}

	@Get('tax-summary')
	async getTaxSummary(
		@Query('year') year: string,
		@Query('quarter') quarter?: string,
	) {
		return this.reportsService.getTaxSummary(
			parseInt(year, 10),
			quarter ? parseInt(quarter, 10) : undefined,
		);
	}

	@Get('expense-breakdown')
	async getExpenseBreakdown(
		@Query('startDate') startDate: string,
		@Query('endDate') endDate: string,
	) {
		return this.reportsService.getExpenseBreakdown(startDate, endDate);
	}

	@Get('owner-report')
	async getOwnerReport(
		@Query('month') month: string,
		@Res() res: Response,
	) {
		const buffer = await this.reportsService.generateOwnerReport(month);
		const filename = `OwnerReport-${month || 'latest'}.pdf`;
		res.set({
			'Content-Type': 'application/pdf',
			'Content-Disposition': `attachment; filename=${filename}`,
			'Content-Length': buffer.length,
		});
		res.end(buffer);
	}
}
