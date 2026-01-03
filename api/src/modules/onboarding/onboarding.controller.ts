import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtPayload } from '@/common/interfaces/jwt-payload.interface';
import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SubmitWebsiteDto } from './dto';
import { OnboardingService } from './onboarding.service';

@Controller('onboarding')
@UseGuards(AuthGuard('jwt'))
export class OnboardingController {
	constructor(private readonly onboardingService: OnboardingService) { }

	/**
	 * Get current onboarding status
	 */
	@Get('status')
	async getOnboardingStatus(@CurrentUser() user: JwtPayload) {
		return this.onboardingService.getOnboardingStatus(user.sub);
	}

	/**
	 * Step 1: Submit website URL
	 */
	@Post('website')
	async submitWebsite(
		@CurrentUser() user: JwtPayload,
		@Body() dto: SubmitWebsiteDto,
	) {
		return this.onboardingService.submitWebsite(user.sub, dto);
	}

	/**
	 * Step 2: Start scraping the website
	 */
	@Post('website/:websiteId/scrape')
	async startScraping(
		@CurrentUser() user: JwtPayload,
		@Param('websiteId') websiteId: string,
	) {
		return this.onboardingService.startScraping(websiteId, user.sub);
	}

	/**
	 * Get scraping status with page stats
	 */
	@Get('website/:websiteId/status')
	async getScrapingStatus(
		@CurrentUser() user: JwtPayload,
		@Param('websiteId') websiteId: string,
	) {
		return this.onboardingService.getScrapingStatus(websiteId, user.sub);
	}

	/**
	 * Get scraped pages for a website
	 */
	@Get('website/:websiteId/pages')
	async getWebsitePages(
		@CurrentUser() user: JwtPayload,
		@Param('websiteId') websiteId: string,
	) {
		return this.onboardingService.getWebsitePages(websiteId, user.sub);
	}

	/**
	 * Get user's websites
	 */
	@Get('websites')
	async getUserWebsites(@CurrentUser() user: JwtPayload) {
		return this.onboardingService.getUserWebsites(user.sub);
	}

	/**
	 * Step 3: Complete onboarding
	 */
	@Post('complete')
	async completeOnboarding(@CurrentUser() user: JwtPayload) {
		return this.onboardingService.completeOnboarding(user.sub);
	}

	/**
	 * Get all user's pages
	 */
	@Get('pages')
	async getAllUserPages(@CurrentUser() user: JwtPayload) {
		return this.onboardingService.getAllUserPages(user.sub);
	}

	/**
	 * Get a single page by ID
	 */
	@Get('pages/:pageId')
	async getPageById(
		@CurrentUser() user: JwtPayload,
		@Param('pageId') pageId: string,
	) {
		return this.onboardingService.getPageById(pageId, user.sub);
	}

	/**
	 * Refetch/rescrape a single page
	 */
	@Post('pages/:pageId/refetch')
	async refetchPage(
		@CurrentUser() user: JwtPayload,
		@Param('pageId') pageId: string,
	) {
		return this.onboardingService.refetchPage(pageId, user.sub);
	}

	/**
	 * Soft delete a page
	 */
	@Delete('pages/:pageId')
	async deletePage(
		@CurrentUser() user: JwtPayload,
		@Param('pageId') pageId: string,
	) {
		return this.onboardingService.deletePage(pageId, user.sub);
	}
}
