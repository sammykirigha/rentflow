import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, IsUUID, ValidateNested } from 'class-validator';
import { UnitType } from '../entities/unit.entity';

export class BulkUnitItemDto {
	@ApiProperty({ description: 'Unit number (e.g., "A-101")' })
	@IsString()
	@IsNotEmpty()
	unitNumber: string;

	@ApiProperty({ description: 'Monthly rent amount in KES' })
	@IsNumber({ maxDecimalPlaces: 2 })
	@IsPositive()
	rentAmount: number;

	@ApiPropertyOptional({ description: 'Unit type/size', enum: UnitType, default: UnitType.ONE_BEDROOM })
	@IsEnum(UnitType)
	@IsOptional()
	unitType?: UnitType;
}

export class BulkCreateUnitsDto {
	@ApiProperty({ description: 'Property ID the units belong to' })
	@IsUUID()
	@IsNotEmpty()
	propertyId: string;

	@ApiProperty({ description: 'Array of units to create', type: [BulkUnitItemDto] })
	@IsArray()
	@ArrayMinSize(1)
	@ValidateNested({ each: true })
	@Type(() => BulkUnitItemDto)
	units: BulkUnitItemDto[];
}
