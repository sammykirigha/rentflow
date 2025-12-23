import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';

config();

const configService = new ConfigService();

const s3Config = {
  accessKeyId: configService.get('AWS_ACCESS_KEY_ID'),
  secretAccessKey: configService.get('AWS_SECRET_ACCESS_KEY'),
  region: configService.get('AWS_REGION'),
  bucket: configService.get('AWS_S3_BUCKET')
}

export default s3Config;