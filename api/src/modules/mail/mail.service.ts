import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class MailService {
	private readonly logger = new Logger(MailService.name);
	private readonly resend: Resend;
	private readonly fromAddress: string;

	constructor(private readonly configService: ConfigService) {
		this.resend = new Resend(this.configService.get('RESEND_API_KEY'));
		this.fromAddress = this.configService.get('MAIL_FROM') || 'RentFlow <noreply@rentflow.co.ke>';
	}

	async sendEmail({ to, subject, html, attachments }: {
		to: string;
		subject: string;
		html: string;
		attachments?: Array<{ filename: string; content: Buffer }>;
	}) {
		try {
			const response = await this.resend.emails.send({
				from: this.fromAddress,
				to,
				subject,
				html,
				...(attachments?.length ? {
					attachments: attachments.map((a) => ({
						filename: a.filename,
						content: a.content,
					})),
				} : {}),
			});

			this.logger.log(`Email sent to ${to}: ${subject}`);
			return response;
		} catch (error) {
			this.logger.error(`Error sending email to ${to}: ${error.message}`);
			return null;
		}
	}
}
