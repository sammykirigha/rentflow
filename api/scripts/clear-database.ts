import AppDataSource from '@/config/database.config';
import { config } from 'dotenv';
import { User } from '../src/modules/users/entities/user.entity';

config();


async function clearDatabase() {
  try {
    console.log('🚀 Starting database cleanup...');
    console.log('📡 Connecting to database...');
    
    // Initialize the data source
    await AppDataSource.initialize();
    console.log('✅ Database connected successfully!');
    
    // Clear all data in reverse dependency order
    console.log('🧹 Clearing existing data...');
    
    // Clear users (adjust this based on your entities and relationships)
    const userRepository = AppDataSource.getRepository(User);
    await userRepository.delete({});
    console.log('✅ Cleared users table');
    
    console.log('🎉 Database cleanup completed!');
    
  } catch (error) {
    console.error('❌ Error clearing database:', error);
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

// Run the cleanup
clearDatabase();