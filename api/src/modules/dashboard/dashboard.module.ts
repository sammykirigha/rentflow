import { Module } from '@nestjs/common';
import { OrgContextModule } from '@/common/services/org-context.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
	imports: [OrgContextModule],
	controllers: [DashboardController],
	providers: [DashboardService],
})
export class DashboardModule {}
