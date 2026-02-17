import { ApiProperty } from '@nestjs/swagger';
import {
	IsEnum,
	IsNotEmpty,
	IsOptional,
	IsString,
} from 'class-validator';
import { NotificationChannel, NotificationType } from '../entities/notification.entity';

export class SendBulkReminderDto {
	@ApiProperty({ description: 'Notification type', enum: NotificationType, default: NotificationType.PAYMENT_REMINDER, required: false })
	@IsEnum(NotificationType)
	@IsOptional()
	type?: NotificationType = NotificationType.PAYMENT_REMINDER;

	@ApiProperty({ description: 'Delivery channel', enum: NotificationChannel, example: NotificationChannel.SMS })
	@IsEnum(NotificationChannel)
	@IsNotEmpty()
	channel: NotificationChannel;

	@ApiProperty({ description: 'Notification subject (for email)', required: false, example: 'Rent Payment Reminder' })
	@IsString()
	@IsOptional()
	subject?: string;

	@ApiProperty({ description: 'Notification message body', example: 'Dear tenant, your rent payment is overdue. Please pay immediately to avoid penalties.' })
	@IsString()
	@IsNotEmpty()
	message: string;
}
