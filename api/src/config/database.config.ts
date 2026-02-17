import { AuditLog } from '@/modules/audit/entities/audit-log.entity';
import { Invoice } from '@/modules/invoices/entities/invoice.entity';
import { Payment } from '@/modules/payments/entities/payment.entity';
import { Permission } from '@/modules/permissions/entities/permission.entity';
import { Role } from '@/modules/permissions/entities/role.entity';
import { Property } from '@/modules/properties/entities/property.entity';
import { Receipt } from '@/modules/receipts/entities/receipt.entity';
import { SystemSetting } from '@/modules/settings/entities/system-setting.entity';
import { Tenant } from '@/modules/tenants/entities/tenant.entity';
import { Unit } from '@/modules/units/entities/unit.entity';
import { User } from '@/modules/users/entities/user.entity';
import { WalletTransaction } from '@/modules/wallet/entities/wallet-transaction.entity';
import { Expense } from '@/modules/expenses/entities/expense.entity';
import { Vendor } from '@/modules/vendors/entities/vendor.entity';
import { MaintenanceRequest } from '@/modules/maintenance/entities/maintenance-request.entity';
import { Notification } from '@/modules/notifications/entities/notification.entity';
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
  Property,
  Unit,
  Tenant,
  Invoice,
  Payment,
  WalletTransaction,
  Receipt,
  Expense,
  Vendor,
  MaintenanceRequest,
  Notification,
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
