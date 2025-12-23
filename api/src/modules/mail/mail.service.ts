import { MailerService } from '@nestjs-modules/mailer';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    private readonly mailerService: MailerService,
  ) { }

  async sendEmail({ to, subject, html }: {
    to: string;
    subject: string;
    html: string;
  }) {
    try {
      const response = await this.mailerService.sendMail({
        to,
        subject,
        html,
      });

      this.logger.log(`Email sent to ${to}: ${subject}`);
      return response;

    } catch (error) {
      this.logger.error(`Error sending email to ${to}: ${error.message}`);
      return null;
    }
  }
}
