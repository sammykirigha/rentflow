import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { UserWebsite } from './entities/user-website.entity';
import { WebsitePage } from './entities/website-page.entity';
import { OnboardingController } from './onboarding.controller';
import { OnboardingRepository } from './onboarding.repository';
import { OnboardingService } from './onboarding.service';
import { WebScraperService } from './web-scraper.service';

@Module({
	imports: [
		TypeOrmModule.forFeature([UserWebsite, WebsitePage, User]),
	],
	controllers: [OnboardingController],
	providers: [OnboardingService, OnboardingRepository, WebScraperService],
	exports: [OnboardingService],
})
export class OnboardingModule { }
