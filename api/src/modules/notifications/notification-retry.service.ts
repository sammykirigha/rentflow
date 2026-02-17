import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { In } from 'typeorm';
import { SmsService } from '../sms/sms.service';
import { MailService } from '../mail/mail.service';
import { NotificationChannel, NotificationStatus } from './entities/notification.entity';
import { NotificationsRepository } from './notifications.repository';

const MAX_RETRY_COUNT = 3;

@Injectable()
export class NotificationRetryService {
	private readonly logger = new Logger(NotificationRetryService.name);

	constructor(
		private readonly notificationsRepository: NotificationsRepository,
		private readonly smsService: SmsService,
		private readonly mailService: MailService,
	) {}

	@Cron(CronExpression.EVERY_5_MINUTES)
	async processUndeliveredNotifications(): Promise<void> {
		const undelivered = await this.notificationsRepository
			.createQueryBuilder('notification')
			.leftJoinAndSelect('notification.tenant', 'tenant')
			.leftJoinAndSelect('tenant.user', 'user')
			.where('notification.status IN (:...statuses)', {
				statuses: [NotificationStatus.FAILED, NotificationStatus.PENDING],
			})
			.andWhere('notification.retryCount < :maxRetries', { maxRetries: MAX_RETRY_COUNT })
			.getMany();

		if (undelivered.length === 0) return;

		this.logger.log(`Processing ${undelivered.length} undelivered notification(s) (pending + failed)`);

		for (const notification of undelivered) {
			const user = notification.tenant?.user;
			if (!user) {
				this.logger.warn(`Skipping notification ${notification.notificationId}: tenant/user not found`);
				continue;
			}

			const errors: string[] = [];

			if ((notification.channel === NotificationChannel.SMS || notification.channel === NotificationChannel.BOTH) && user.phone) {
				const smsResult = await this.smsService.sendSms(user.phone, notification.message);
				if (!smsResult.success) {
					errors.push('SMS delivery failed');
				}
			}

			if ((notification.channel === NotificationChannel.EMAIL || notification.channel === NotificationChannel.BOTH) && user.email) {
				const emailResult = await this.mailService.sendEmail({
					to: user.email,
					subject: notification.subject || 'RentFlow Notification',
					html: notification.message,
				});
				if (!emailResult) {
					errors.push('Email delivery failed');
				}
			}

			if (errors.length === 0) {
				await this.notificationsRepository.update(
					{ notificationId: notification.notificationId },
					{
						status: NotificationStatus.SENT,
						sentAt: new Date(),
						failReason: null,
					} as any,
				);

				this.logger.log(
					`Delivery succeeded for notification ${notification.notificationId} (attempt ${notification.retryCount + 1})`,
				);
			} else {
				const newRetryCount = notification.retryCount + 1;
				const failReason = errors.join('; ');

				await this.notificationsRepository.update(
					{ notificationId: notification.notificationId },
					{
						status: NotificationStatus.FAILED,
						retryCount: newRetryCount,
						failReason,
					} as any,
				);

				this.logger.error(
					`Delivery failed for notification ${notification.notificationId} ` +
					`(attempt ${newRetryCount}/${MAX_RETRY_COUNT}): ${failReason}`,
				);
			}
		}
	}
}
