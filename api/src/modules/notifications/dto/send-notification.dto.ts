import { ApiProperty } from '@nestjs/swagger';
import {
	IsEnum,
	IsNotEmpty,
	IsOptional,
	IsString,
	IsUUID,
} from 'class-validator';
import { NotificationChannel, NotificationType } from '../entities/notification.entity';

export class SendNotificationDto {
	@ApiProperty({ description: 'UUID of the tenant', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
	@IsUUID()
	@IsNotEmpty()
	tenantId: string;

	@ApiProperty({ description: 'UUID of the related invoice', required: false, example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
	@IsUUID()
	@IsOptional()
	invoiceId?: string;

	@ApiProperty({ description: 'Notification type', enum: NotificationType, example: NotificationType.PAYMENT_REMINDER })
	@IsEnum(NotificationType)
	@IsNotEmpty()
	type: NotificationType;

	@ApiProperty({ description: 'Delivery channel', enum: NotificationChannel, example: NotificationChannel.SMS })
	@IsEnum(NotificationChannel)
	@IsNotEmpty()
	channel: NotificationChannel;

	@ApiProperty({ description: 'Notification subject (for email)', required: false, example: 'Rent Payment Reminder' })
	@IsString()
	@IsOptional()
	subject?: string;

	@ApiProperty({ description: 'Notification message body', example: 'Dear tenant, your rent of KES 35,000 is due on the 5th.' })
	@IsString()
	@IsNotEmpty()
	message: string;
}
