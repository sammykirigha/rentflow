import { entities } from '@/config/database.config';
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Global()
@Module({
	imports: [
		TypeOrmModule.forRootAsync({
			useFactory: (configService: ConfigService) => ({
				type: 'postgres',
				host: configService.getOrThrow('DATABASE_HOST'),
				port: configService.getOrThrow('DATABASE_PORT'),
				database: configService.getOrThrow('DATABASE_NAME'),
				username: configService.getOrThrow('DATABASE_USERNAME'),
				password: configService.getOrThrow('DATABASE_PASSWORD'),
				entities,
				migrationsTableName: 'migrations',
				migrationsRun: true,
				logging: false, // process.env.ENV !== 'production',
				ssl: process.env.NODE_ENV === 'production',
				extra: {
					connectionLimit: 10,
					...(process.env.NODE_ENV === 'production' ? {
						ssl: {
							rejectUnauthorized: false
						}
					} : {})
				},
			}),
			inject: [ConfigService],
		}),
	],
	exports: [TypeOrmModule],
})
export class DatabaseModule { }