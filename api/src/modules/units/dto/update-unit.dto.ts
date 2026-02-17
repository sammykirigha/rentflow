import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';
import { UnitType } from '../entities/unit.entity';

export class UpdateUnitDto {
	@ApiPropertyOptional({ description: 'Unit number (e.g., "A-101")' })
	@IsString()
	@IsOptional()
	unitNumber?: string;

	@ApiPropertyOptional({ description: 'Monthly rent amount in KES' })
	@IsNumber({ maxDecimalPlaces: 2 })
	@IsPositive()
	@IsOptional()
	rentAmount?: number;

	@ApiPropertyOptional({ description: 'Whether the unit is occupied' })
	@IsBoolean()
	@IsOptional()
	isOccupied?: boolean;

	@ApiPropertyOptional({ description: 'Unit type/size', enum: UnitType })
	@IsEnum(UnitType)
	@IsOptional()
	unitType?: UnitType;
}
