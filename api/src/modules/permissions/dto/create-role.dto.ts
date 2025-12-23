import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateRoleDto {
	@ApiProperty({ example: 'Content Manager' })
	@IsNotEmpty()
	@IsString()
	name: string;

	@ApiPropertyOptional({ example: 'Can manage papers and teachers' })
	@IsOptional()
	@IsString()
	description?: string;

	@ApiProperty({
		type: [String],
		example: ['uuid-1', 'uuid-2'],
		description: 'Array of permission IDs'
	})
	@IsArray()
	permissionIds: string[];
}
