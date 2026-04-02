import { IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class CreateRentEscalationDto {
	@IsUUID()
	propertyId: string;

	@IsNumber()
	@Min(0.1)
	@Max(50)
	percentage: number;

	@IsString()
	effectiveDate: string;

	@IsOptional()
	@IsString()
	notes?: string;
}
