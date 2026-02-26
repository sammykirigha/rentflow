import AppDataSource from '@/config/database.config';
import { config } from 'dotenv';
import { PermissionsSeed } from '../src/database/seeds/001-permissions.seed';
import { InitialUsersSeed } from '../src/database/seeds/002-initial-users.seed';
import { SystemSettingsSeed } from '../src/database/seeds/003-system-settings.seed';
import { PropertiesUnitsTenantsSeed } from '../src/database/seeds/004-properties-units-tenants.seed';
import { ReconciliationPaymentsSeed } from '../src/database/seeds/005-reconciliation-payments.seed';

// Load environment variables
config();

async function runSeeds() {
  try {
    console.log('🚀 Starting database seeding...');
    console.log('📡 Connecting to database...');

    // Initialize the data source
    await AppDataSource.initialize();
    console.log('✅ Database connected successfully!');

    // Run other seeds in order
    const seeds = [
      new PermissionsSeed(),
      new InitialUsersSeed(),
      new SystemSettingsSeed(),
      new PropertiesUnitsTenantsSeed(),
      new ReconciliationPaymentsSeed(),
    ];

    for (const seed of seeds) {
      await seed.run(AppDataSource);
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    console.log('🎉 All seeds completed successfully!');

  } catch (error) {
    console.error('❌ Error running seeds:', error);
    process.exit(1);
  } finally {
    // Close the connection
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('📡 Database connection closed.');
    }
    process.exit(0);
  }
}

// Run the seeds
runSeeds();