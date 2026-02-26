import AppDataSource from '@/config/database.config';
import { config } from 'dotenv';
import { PermissionsSeed } from '../src/database/seeds/001-permissions.seed';
import { InitialUsersSeed } from '../src/database/seeds/002-initial-users.seed';
import { SystemSettingsSeed } from '../src/database/seeds/003-system-settings.seed';

// Load environment variables
config();

async function runProductionSeeds() {
  try {
    console.log('Starting production database seeding...');
    console.log('Connecting to database...');

    await AppDataSource.initialize();
    console.log('Database connected successfully!');

    // Production seeds only: permissions, initial users, system settings
    const seeds = [
      new PermissionsSeed(),
      new InitialUsersSeed(),
      new SystemSettingsSeed(),
    ];

    for (const seed of seeds) {
      await seed.run(AppDataSource);
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    console.log('Production seeds completed successfully!');

  } catch (error) {
    console.error('Error running production seeds:', error);
    process.exit(1);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('Database connection closed.');
    }
    process.exit(0);
  }
}

runProductionSeeds();
