import { ApiProperty } from '@nestjs/swagger';
import {
	IsEnum,
	IsNotEmpty,
	IsOptional,
	IsString,
} from 'class-validator';
import { NotificationChannel } from '../entities/notification.entity';

export class SendBulkMessageDto {
	@ApiProperty({ description: 'Delivery channel', enum: NotificationChannel, example: NotificationChannel.SMS })
	@IsEnum(NotificationChannel)
	@IsNotEmpty()
	channel: NotificationChannel;

	@ApiProperty({ description: 'Message subject (for email)', required: false, example: 'Important Notice from RentFlow' })
	@IsString()
	@IsOptional()
	subject?: string;

	@ApiProperty({ description: 'Message body', example: 'Dear tenant, please be advised that rent will be adjusted effective next month.' })
	@IsString()
	@IsNotEmpty()
	message: string;
}
