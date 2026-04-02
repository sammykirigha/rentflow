import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { MeterType } from '../entities/meter-reading.entity';

export class CreateMeterReadingDto {
	@IsUUID()
	unitId: string;

	@IsEnum(MeterType)
	meterType: MeterType;

	@IsNumber()
	@Min(0)
	previousReading: number;

	@IsNumber()
	@Min(0)
	currentReading: number;

	@IsNumber()
	@Min(0)
	rate: number;

	@IsString()
	billingMonth: string;

	@IsOptional()
	@IsString()
	notes?: string;
}
