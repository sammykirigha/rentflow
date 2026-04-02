import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { CreateRentEscalationDto } from './dto/create-rent-escalation.dto';
import { RentEscalationsService } from './rent-escalations.service';

@Controller('rent-escalations')
@UseGuards(JwtAuthGuard)
export class RentEscalationsController {
	constructor(private readonly service: RentEscalationsService) {}

	@Post()
	async create(@Body() dto: CreateRentEscalationDto, @Req() req: any) {
		return this.service.create(dto, req.user.sub);
	}

	@Get()
	async findAll(
		@Query('page') page?: string,
		@Query('limit') limit?: string,
		@Query('propertyId') propertyId?: string,
	) {
		return this.service.findAll(
			parseInt(page || '1', 10),
			parseInt(limit || '20', 10),
			propertyId,
		);
	}

	@Delete(':id')
	async cancel(@Param('id') id: string, @Req() req: any) {
		return this.service.cancel(id, req.user.sub);
	}
}
