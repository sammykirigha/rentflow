import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';

config();

const configService = new ConfigService();

const authConfig = {
  jwtSecret: configService.get('JWT_SECRET'),
  jwtExpiresIn: configService.get('JWT_EXPIRES_IN'),
  jwtRefreshSecret: configService.get('JWT_REFRESH_SECRET'),
  jwtRefreshExpiresIn: configService.get('JWT_REFRESH_EXPIRES_IN'),
  bcryptRounds: 10,
};

export default authConfig;