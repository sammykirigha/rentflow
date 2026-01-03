import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class EditWithAiDto {
	@ApiProperty({
		description: 'Instructions for how the AI should modify the article',
		example: 'Make the article more conversational and add more examples',
	})
	@IsString()
	@IsNotEmpty()
	@MaxLength(2000)
	instructions: string;
}
