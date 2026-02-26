import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SmsService {
	private readonly logger = new Logger(SmsService.name);
	private readonly sms: any;

	constructor(private readonly configService: ConfigService) {
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const AfricasTalking = require('africastalking');
		const at = AfricasTalking({
			apiKey: this.configService.get('AT_API_KEY'),
			username: this.configService.get('AT_USERNAME'),
		});
		this.sms = at.SMS;
	}

	async sendSms(to: string, message: string): Promise<{ success: boolean; messageId?: string }> {
		const normalized = this.normalizePhone(to);

		try {
			const senderId = this.configService.get<string>('AT_SENDER_ID');
			const options: any = {
				to: [`+${normalized}`],
				message,
			};
			if (senderId) {
				options.from = senderId;
			}

			const result = await this.sms.send(options);
			const recipient = result?.SMSMessageData?.Recipients?.[0];

			if (recipient?.statusCode === 101) {
				this.logger.log(`SMS sent to +${normalized}: ${recipient.messageId}`);
				return { success: true, messageId: recipient.messageId };
			}

			this.logger.warn(`SMS to +${normalized} status: ${recipient?.status}`);
			return { success: false };
		} catch (error) {
			this.logger.error(`Failed to send SMS to +${normalized}: ${error.message}`);
			return { success: false };
		}
	}

	async sendBulkSms(recipients: { phone: string; message: string }[]): Promise<{ sent: number; failed: number }> {
		let sent = 0;
		let failed = 0;

		for (const recipient of recipients) {
			try {
				const result = await this.sendSms(recipient.phone, recipient.message);
				if (result.success) {
					sent++;
				} else {
					failed++;
				}
			} catch (error) {
				this.logger.error(`Failed to send SMS to ${recipient.phone}: ${error.message}`);
				failed++;
			}
		}

		return { sent, failed };
	}

	private normalizePhone(phone: string): string {
		const cleaned = phone.replace(/[^0-9+]/g, '');
		if (cleaned.startsWith('+254')) return cleaned.substring(1);
		if (cleaned.startsWith('254')) return cleaned;
		if (cleaned.startsWith('0')) return `254${cleaned.substring(1)}`;
		return cleaned;
	}
}
