import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Permission, RequirePermissions } from '@/common/decorators/permissions.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { JwtPayload } from '@/common/interfaces/jwt-payload.interface';
import { PermissionAction, PermissionResource } from '@/modules/permissions/entities/permission.entity';
import {
	Body,
	ClassSerializerInterceptor,
	Controller,
	Delete,
	Get,
	Param,
	ParseIntPipe,
	Post,
	Query,
	UseGuards,
	UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { SendBulkMessageDto } from './dto/send-bulk-message.dto';
import { SendBulkReminderDto } from './dto/send-bulk-reminder.dto';
import { SendNotificationDto } from './dto/send-notification.dto';
import { NotificationChannel, NotificationStatus, NotificationType } from './entities/notification.entity';
import { NotificationsService } from './notifications.service';

@ApiTags('Communications')
@Controller('communications')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiSecurity('bearer')
@ApiBearerAuth('JWT')
export class NotificationsController {
	constructor(private readonly notificationsService: NotificationsService) {}

	@Get('my')
	@ApiOperation({ summary: 'Get my notifications (tenant self-service)' })
	@ApiResponse({ status: 200, description: 'Notifications retrieved successfully' })
	@ApiQuery({ name: 'page', required: false, type: Number })
	@ApiQuery({ name: 'limit', required: false, type: Number })
	@ApiQuery({ name: 'type', required: false, enum: NotificationType })
	async findMy(
		@CurrentUser() user: JwtPayload,
		@Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
		@Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
		@Query('type') type?: NotificationType,
	) {
		// Resolve tenant from JWT user
		const tenant = await this.notificationsService.findTenantByUserId(user.sub);
		return this.notificationsService.findByTenant({ tenantId: tenant.tenantId, page, limit, type });
	}

	@Get()
	@RequirePermissions(Permission(PermissionResource.COMMUNICATIONS, PermissionAction.READ))
	@ApiOperation({ summary: 'List notifications with pagination and filters' })
	@ApiResponse({ status: 200, description: 'Notifications retrieved successfully' })
	@ApiQuery({ name: 'page', required: false, type: Number })
	@ApiQuery({ name: 'limit', required: false, type: Number })
	@ApiQuery({ name: 'tenantId', required: false, type: String })
	@ApiQuery({ name: 'type', required: false, enum: NotificationType })
	@ApiQuery({ name: 'channel', required: false, enum: NotificationChannel })
	@ApiQuery({ name: 'status', required: false, enum: NotificationStatus })
	async findAll(
		@Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
		@Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
		@Query('tenantId') tenantId?: string,
		@Query('type') type?: NotificationType,
		@Query('channel') channel?: NotificationChannel,
		@Query('status') status?: NotificationStatus,
	) {
		return this.notificationsService.findAll({ page, limit, tenantId, type, channel, status });
	}

	@Post('send')
	@RequirePermissions(Permission(PermissionResource.COMMUNICATIONS, PermissionAction.CREATE))
	@ApiOperation({ summary: 'Send a notification to a specific tenant' })
	@ApiResponse({ status: 201, description: 'Notification sent successfully' })
	@ApiResponse({ status: 404, description: 'Tenant not found' })
	async send(
		@Body() sendNotificationDto: SendNotificationDto,
		@CurrentUser() user: JwtPayload,
	) {
		return this.notificationsService.send(sendNotificationDto, user.sub);
	}

	@Post('bulk-reminder')
	@RequirePermissions(Permission(PermissionResource.COMMUNICATIONS, PermissionAction.CREATE))
	@ApiOperation({ summary: 'Send bulk reminders to all tenants with unpaid invoices' })
	@ApiResponse({ status: 201, description: 'Bulk reminders sent successfully' })
	async sendBulkReminder(
		@Body() sendBulkReminderDto: SendBulkReminderDto,
		@CurrentUser() user: JwtPayload,
	) {
		return this.notificationsService.sendBulkReminder(sendBulkReminderDto, user.sub);
	}

	@Post('bulk-message')
	@RequirePermissions(Permission(PermissionResource.COMMUNICATIONS, PermissionAction.CREATE))
	@ApiOperation({ summary: 'Send a general message to all active tenants' })
	@ApiResponse({ status: 201, description: 'Bulk message sent successfully' })
	async sendBulkMessage(
		@Body() sendBulkMessageDto: SendBulkMessageDto,
		@CurrentUser() user: JwtPayload,
	) {
		return this.notificationsService.sendBulkMessage(sendBulkMessageDto, user.sub);
	}

	@Post(':notificationId/resend')
	@RequirePermissions(Permission(PermissionResource.COMMUNICATIONS, PermissionAction.CREATE))
	@ApiOperation({ summary: 'Resend a failed notification' })
	@ApiResponse({ status: 200, description: 'Notification resent successfully' })
	@ApiResponse({ status: 404, description: 'Notification not found' })
	async resend(
		@Param('notificationId') notificationId: string,
		@CurrentUser() user: JwtPayload,
	) {
		return this.notificationsService.resend(notificationId, user.sub);
	}

	@Delete(':notificationId')
	@RequirePermissions(Permission(PermissionResource.COMMUNICATIONS, PermissionAction.CREATE))
	@ApiOperation({ summary: 'Delete a notification' })
	@ApiResponse({ status: 200, description: 'Notification deleted successfully' })
	@ApiResponse({ status: 404, description: 'Notification not found' })
	async delete(@Param('notificationId') notificationId: string) {
		await this.notificationsService.delete(notificationId);
		return { message: 'Notification deleted successfully' };
	}
}
