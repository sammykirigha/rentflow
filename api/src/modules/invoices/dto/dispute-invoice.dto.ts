import { IsString, IsNotEmpty, MinLength, MaxLength, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DisputeInvoiceDto {
	@ApiProperty({
		description: 'Reason for the dispute',
		example: 'incorrect_rent',
		enum: ['incorrect_rent', 'wrong_utilities', 'already_paid', 'unfair_penalty', 'duplicate', 'other'],
	})
	@IsString()
	@IsNotEmpty()
	@IsIn(['incorrect_rent', 'wrong_utilities', 'already_paid', 'unfair_penalty', 'duplicate', 'other'])
	reason: string;

	@ApiProperty({
		description: 'Additional details about the dispute',
		example: 'The rent amount should be KES 25,000, not KES 30,000',
	})
	@IsString()
	@IsNotEmpty()
	@MinLength(10)
	@MaxLength(500)
	comment: string;
}
