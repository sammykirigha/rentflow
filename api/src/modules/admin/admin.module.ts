import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { AdminStatsService } from './admin-stats.service';
import { AdminController } from './admin.controller';

@Module({
	imports: [
		TypeOrmModule.forFeature([
			User,
		]),
	],
	controllers: [AdminController],
	providers: [AdminStatsService],
	exports: [AdminStatsService],
})
export class AdminModule { }
