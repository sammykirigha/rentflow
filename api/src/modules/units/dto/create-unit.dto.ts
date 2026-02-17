import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, IsUUID } from 'class-validator';
import { UnitType } from '../entities/unit.entity';

export class CreateUnitDto {
	@ApiProperty({ description: 'Unit number (e.g., "A-101")' })
	@IsString()
	@IsNotEmpty()
	unitNumber: string;

	@ApiProperty({ description: 'Property ID the unit belongs to' })
	@IsUUID()
	@IsNotEmpty()
	propertyId: string;

	@ApiProperty({ description: 'Monthly rent amount in KES' })
	@IsNumber({ maxDecimalPlaces: 2 })
	@IsPositive()
	rentAmount: number;

	@ApiPropertyOptional({ description: 'Unit type/size', enum: UnitType, default: UnitType.ONE_BEDROOM })
	@IsEnum(UnitType)
	@IsOptional()
	unitType?: UnitType;
}
