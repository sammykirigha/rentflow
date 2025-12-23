import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';

config();

const configService = new ConfigService();

const mailConfig = {
	host: configService.get('MAIL_HOST'),
	port: parseInt(configService.get('MAIL_PORT'), 10),
	secure: false, // true for 465, false for other ports
	auth: {
		user: configService.get('MAIL_USER'),
		pass: configService.get('MAIL_PASSWORD'),
	},
	from: configService.get('MAIL_FROM') || `No Reply <${configService.get('MAIL_USER')}>`,
};
export default mailConfig;