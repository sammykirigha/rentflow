import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';

config();

const configService = new ConfigService();

export const buildFileAccessUrl = (accessKey: string): string => {
	return `${configService.get<string>('BACKEND_URL')}/api/v1/storage/file/${accessKey}`;
};