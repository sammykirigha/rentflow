import { AuditLog } from '@/modules/audit/entities/audit-log.entity';
import { UserWebsite } from '@/modules/onboarding/entities/user-website.entity';
import { WebsitePage } from '@/modules/onboarding/entities/website-page.entity';
import { Permission } from '@/modules/permissions/entities/permission.entity';
import { Role } from '@/modules/permissions/entities/role.entity';
import { AiModelConfiguration } from '@/modules/settings/entities/ai-model-configuration.entity';
import { SystemSetting } from '@/modules/settings/entities/system-setting.entity';
import { User } from '@/modules/users/entities/user.entity';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';

config();

const configService = new ConfigService();

export const entities = [
  User,
  Role,
  Permission,
  SystemSetting,
  AuditLog,
  AiModelConfiguration,
  UserWebsite,
  WebsitePage,
];

export default new DataSource({
  type: 'postgres',
  host: configService.getOrThrow('DATABASE_HOST'),
  port: configService.getOrThrow('DATABASE_PORT'),
  database: configService.getOrThrow('DATABASE_NAME'),
  username: configService.getOrThrow('DATABASE_USERNAME'),
  password: configService.getOrThrow('DATABASE_PASSWORD'),
  migrations: ['src/database/migrations/**'],
  synchronize: false,
  logging: false,
  migrationsRun: true,
  ssl: process.env.NODE_ENV === 'production',
  extra: {
    connectionLimit: 10,
    ...(process.env.NODE_ENV === 'production' ? {
      ssl: {
        rejectUnauthorized: false
      }
    } : {})
  },
  entities,
});