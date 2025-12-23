# Commands

### Run All Seeds
```bash
npm run seed
```

### Clear Database
```bash
npm run seed:clear
```

### Fresh Seed (Clear + Seed)
```bash
npm run seed:fresh
```

## Usage

1. **First Time Setup:**
   ```bash
   # Make sure your database is created
   create db eduai_dev
   
   # Run migrations first
   npm run migration:run
   
   # Then seed data
   npm run seed
   ```

2. **Reset Database:**
   ```bash
   # This will clear all data and reseed
   npm run seed:fresh
   ```

3. **Development:**
   ```bash
   # Just add new data without clearing
   npm run seed
   ```

## Adding New Seeds

1. Create a new seed file: `XXX-your-seed-name.seed.ts`
2. Implement the seed class with a `run(dataSource: DataSource)` method
3. Add the seed to `run-seeds.ts` imports and seeds array
4. The seeds run in numerical order (001, 002, 003, etc.)

## Example Seed Structure

```typescript
import { DataSource } from 'typeorm';
import { YourEntity } from '../../modules/your-module/entities/your-entity.entity';

export class YourSeed {
  public async run(dataSource: DataSource): Promise<void> {
    const repository = dataSource.getRepository(YourEntity);
    
    // Your seeding logic here
    console.log('🌱 Seeding your data...');
    
    // Check if data exists
    const existingData = await repository.findOne({ where: { /* condition */ } });
    
    if (!existingData) {
      // Create new data
      const newData = repository.create({ /* data */ });
      await repository.save(newData);
      console.log('✅ Created your data');
    } else {
      console.log('⏭️  Data already exists');
    }
  }
}
```

## Environment Variables

Make sure your `.env` file has the correct database configuration:

```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=password
DATABASE_NAME=eduai_dev
```

## Notes

- Seeds are idempotent - they check if data exists before creating
- All passwords are hashed using bcrypt with 12 rounds
- Seeds run in a transaction, so they either all succeed or all fail
- Always test seeds in development before running in production