import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';

export class MarkNotificationsReadDto {
	@ApiProperty({ type: [String], description: 'IDs of notifications to mark as read' })
	@IsArray()
	@ArrayNotEmpty()
	@IsUUID('4', { each: true })
	notificationIds: string[];
}
