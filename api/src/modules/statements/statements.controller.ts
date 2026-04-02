import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { StatementsService } from './statements.service';

@Controller('statements')
@UseGuards(JwtAuthGuard)
export class StatementsController {
	constructor(private readonly statementsService: StatementsService) {}

	@Get(':tenantId')
	async generateStatement(
		@Param('tenantId') tenantId: string,
		@Query('month') month: string,
		@Res() res: Response,
	) {
		const buffer = await this.statementsService.generateStatement(tenantId, month);
		res.set({
			'Content-Type': 'application/pdf',
			'Content-Disposition': `attachment; filename=Statement-${month}.pdf`,
			'Content-Length': buffer.length,
		});
		res.end(buffer);
	}
}
