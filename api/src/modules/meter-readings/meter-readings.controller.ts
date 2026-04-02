import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { CreateMeterReadingDto } from './dto/create-meter-reading.dto';
import { MeterType } from './entities/meter-reading.entity';
import { MeterReadingsService } from './meter-readings.service';

@Controller('meter-readings')
@UseGuards(JwtAuthGuard)
export class MeterReadingsController {
	constructor(private readonly meterReadingsService: MeterReadingsService) {}

	@Post()
	async create(@Body() dto: CreateMeterReadingDto, @Req() req: any) {
		return this.meterReadingsService.create(dto, req.user.sub);
	}

	@Get()
	async findAll(
		@Query('page') page?: string,
		@Query('limit') limit?: string,
		@Query('unitId') unitId?: string,
		@Query('meterType') meterType?: MeterType,
	) {
		return this.meterReadingsService.findAll(
			parseInt(page || '1', 10),
			parseInt(limit || '20', 10),
			unitId,
			meterType,
		);
	}

	@Get('by-unit')
	async findByUnit(
		@Query('unitId') unitId: string,
		@Query('billingMonth') billingMonth?: string,
	) {
		return this.meterReadingsService.findByUnit(unitId, billingMonth);
	}

	@Get('latest')
	async getLatest(
		@Query('unitId') unitId: string,
		@Query('meterType') meterType: MeterType,
	) {
		return this.meterReadingsService.getLatestForUnit(unitId, meterType);
	}
}
