import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { SubmitWebsiteDto } from './dto';
import { UserWebsite, WebsiteScrapingStatus } from './entities/user-website.entity';
import { PageScrapingStatus, WebsitePage } from './entities/website-page.entity';
import { OnboardingRepository } from './onboarding.repository';
import { WebScraperService } from './web-scraper.service';

@Injectable()
export class OnboardingService {
	private readonly logger = new Logger(OnboardingService.name);

	constructor(
		private readonly onboardingRepository: OnboardingRepository,
		private readonly webScraperService: WebScraperService,
		@InjectRepository(User)
		private readonly userRepository: Repository<User>,
	) { }

	async submitWebsite(userId: string, dto: SubmitWebsiteDto): Promise<UserWebsite> {
		// Check if user exists
		const user = await this.userRepository.findOne({ where: { userId } });
		if (!user) {
			throw new NotFoundException('User not found');
		}

		// Check if user already has a primary website
		const existingPrimary = await this.onboardingRepository.findPrimaryByUserId(userId);

		// Create new website entry
		const website = await this.onboardingRepository.create({
			userId,
			websiteUrl: dto.websiteUrl,
			isPrimary: !existingPrimary, // Make it primary if user doesn't have one
			scrapingStatus: WebsiteScrapingStatus.PENDING,
		});

		return website;
	}

	async startScraping(websiteId: string, userId: string): Promise<UserWebsite> {
		const website = await this.onboardingRepository.findOne({
			where: { websiteId, userId },
		});

		if (!website) {
			throw new NotFoundException('Website not found');
		}

		// Update status to processing
		await this.onboardingRepository.update(
			{ websiteId },
			{ scrapingStatus: WebsiteScrapingStatus.PROCESSING },
		);

		// Start scraping in background (non-blocking)
		this.performFullScraping(websiteId, website.websiteUrl).catch(error => {
			this.logger.error(`Background scraping failed for website ${websiteId}:`, error);
		});

		return this.onboardingRepository.findOne({ where: { websiteId } });
	}

	/**
	 * Perform full scraping of main page and internal pages
	 */
	private async performFullScraping(websiteId: string, websiteUrl: string): Promise<void> {
		try {
			// Step 1: Scrape the main page
			const mainPageData = await this.webScraperService.scrapeWebsite(websiteUrl);

			// Update main website with scraped data
			await this.onboardingRepository.update(
				{ websiteId },
				{
					websiteName: mainPageData.title,
					websiteDescription: mainPageData.description,
					scrapedContent: mainPageData.content,
					scrapedMeta: {
						title: mainPageData.title,
						description: mainPageData.description,
						keywords: mainPageData.keywords,
						favicon: mainPageData.favicon,
						ogImage: mainPageData.ogImage,
						headings: mainPageData.headings,
						links: mainPageData.links,
						internalLinks: mainPageData.internalLinks,
						externalLinks: mainPageData.externalLinks,
					},
					totalPagesFound: (mainPageData.internalLinks?.length || 0) + 1,
					scrapedAt: new Date(),
				},
			);

			// Step 2: Create pending page entries for all internal links
			const internalLinks = mainPageData.internalLinks || [];
			if (internalLinks.length > 0) {
				const pageEntries: Partial<WebsitePage>[] = internalLinks.map(link => ({
					websiteId,
					pageUrl: link,
					pagePath: this.extractPath(link),
					scrapingStatus: PageScrapingStatus.PENDING,
					depth: 1,
				}));

				await this.onboardingRepository.createPages(pageEntries);
			}

			// Step 3: Scrape each internal page
			let scrapedCount = 0;
			for (const link of internalLinks) {
				try {
					const pageData = await this.webScraperService.scrapePage(link, websiteUrl);

					if (pageData) {
						// Update the page record
						const existingPage = await this.onboardingRepository.findPageByUrl(websiteId, link);
						if (existingPage) {
							await this.onboardingRepository.updatePage(existingPage.pageId, {
								pageTitle: pageData.title,
								pageDescription: pageData.description,
								scrapedContent: pageData.content,
								scrapedMeta: {
									title: pageData.title,
									description: pageData.description,
									keywords: pageData.keywords,
									ogImage: pageData.ogImage,
									headings: pageData.headings,
									internalLinks: pageData.internalLinks,
									externalLinks: pageData.externalLinks,
								},
								scrapingStatus: PageScrapingStatus.COMPLETED,
								scrapedAt: new Date(),
								wordCount: pageData.wordCount,
							});
							scrapedCount++;
						}
					}
				} catch (error) {
					this.logger.warn(`Failed to scrape page ${link}:`, error.message);
					const existingPage = await this.onboardingRepository.findPageByUrl(websiteId, link);
					if (existingPage) {
						await this.onboardingRepository.updatePage(existingPage.pageId, {
							scrapingStatus: PageScrapingStatus.FAILED,
							scrapingError: error.message,
						});
					}
				}

				// Update progress
				await this.onboardingRepository.update(
					{ websiteId },
					{ totalPagesScraped: scrapedCount + 1 }, // +1 for main page
				);

				// Small delay between requests
				await this.delay(300);
			}

			// Mark as completed
			await this.onboardingRepository.update(
				{ websiteId },
				{
					scrapingStatus: WebsiteScrapingStatus.COMPLETED,
					totalPagesScraped: scrapedCount + 1,
				},
			);

		} catch (error) {
			this.logger.error(`Full scraping failed for website ${websiteId}:`, error);

			// Update status to failed
			await this.onboardingRepository.update(
				{ websiteId },
				{
					scrapingStatus: WebsiteScrapingStatus.FAILED,
					scrapingError: error.message,
				},
			);
		}
	}

	private extractPath(url: string): string {
		try {
			const parsed = new URL(url);
			return parsed.pathname || '/';
		} catch {
			return '/';
		}
	}

	private delay(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	async getScrapingStatus(websiteId: string, userId: string): Promise<{
		website: UserWebsite;
		pageStats: {
			total: number;
			completed: number;
			pending: number;
			failed: number;
		};
	}> {
		const website = await this.onboardingRepository.findOne({
			where: { websiteId, userId },
		});

		if (!website) {
			throw new NotFoundException('Website not found');
		}

		const pageStats = await this.onboardingRepository.getPageStats(websiteId);

		return { website, pageStats };
	}

	async getWebsitePages(websiteId: string, userId: string): Promise<WebsitePage[]> {
		const website = await this.onboardingRepository.findOne({
			where: { websiteId, userId },
		});

		if (!website) {
			throw new NotFoundException('Website not found');
		}

		return this.onboardingRepository.findPagesByWebsiteId(websiteId);
	}

	async completeOnboarding(userId: string): Promise<User> {
		// Verify user has at least one successfully scraped website
		const websites = await this.onboardingRepository.findByUserId(userId);
		const hasCompletedWebsite = websites.some(
			w => w.scrapingStatus === WebsiteScrapingStatus.COMPLETED,
		);

		if (!hasCompletedWebsite) {
			throw new NotFoundException('Please complete website scraping before proceeding');
		}

		// Mark user as onboarded
		await this.userRepository.update({ userId }, { isOnboarded: true });

		return this.userRepository.findOne({ where: { userId } });
	}

	async getUserWebsites(userId: string): Promise<UserWebsite[]> {
		return this.onboardingRepository.findByUserId(userId);
	}

	async getOnboardingStatus(userId: string): Promise<{
		isOnboarded: boolean;
		hasWebsite: boolean;
		websiteStatus?: WebsiteScrapingStatus;
		website?: UserWebsite;
		pageStats?: {
			total: number;
			completed: number;
			pending: number;
			failed: number;
		};
	}> {
		const user = await this.userRepository.findOne({ where: { userId } });
		if (!user) {
			throw new NotFoundException('User not found');
		}

		const websites = await this.onboardingRepository.findByUserId(userId);
		const primaryWebsite = websites.find(w => w.isPrimary) || websites[0];

		let pageStats;
		if (primaryWebsite) {
			pageStats = await this.onboardingRepository.getPageStats(primaryWebsite.websiteId);
		}

		return {
			isOnboarded: user.isOnboarded,
			hasWebsite: websites.length > 0,
			websiteStatus: primaryWebsite?.scrapingStatus,
			website: primaryWebsite,
			pageStats,
		};
	}

	/**
	 * Get all non-deleted pages for a user
	 */
	async getAllUserPages(userId: string): Promise<WebsitePage[]> {
		return this.onboardingRepository.findActivePagesByUserId(userId);
	}

	/**
	 * Get a single page by ID
	 */
	async getPageById(pageId: string, userId: string): Promise<WebsitePage> {
		const page = await this.onboardingRepository.findPageById(pageId);

		if (!page) {
			throw new NotFoundException('Page not found');
		}

		// Verify ownership through website
		if (page.website?.userId !== userId) {
			throw new NotFoundException('Page not found');
		}

		return page;
	}

	/**
	 * Refetch/rescrape a single page (no nested scraping)
	 */
	async refetchPage(pageId: string, userId: string): Promise<WebsitePage> {
		const page = await this.onboardingRepository.findPageById(pageId);

		if (!page) {
			throw new NotFoundException('Page not found');
		}

		// Verify ownership through website
		if (page.website?.userId !== userId) {
			throw new NotFoundException('Page not found');
		}

		// Get the website for base URL
		const website = await this.onboardingRepository.findOne({
			where: { websiteId: page.websiteId },
		});

		if (!website) {
			throw new NotFoundException('Website not found');
		}

		// Update status to processing
		await this.onboardingRepository.updatePage(pageId, {
			scrapingStatus: PageScrapingStatus.PROCESSING,
			scrapingError: null,
		});

		try {
			// Scrape the page
			const pageData = await this.webScraperService.scrapePage(page.pageUrl, website.websiteUrl);

			if (pageData) {
				await this.onboardingRepository.updatePage(pageId, {
					pageTitle: pageData.title,
					pageDescription: pageData.description,
					scrapedContent: pageData.content,
					scrapedMeta: {
						title: pageData.title,
						description: pageData.description,
						keywords: pageData.keywords,
						ogImage: pageData.ogImage,
						headings: pageData.headings,
						internalLinks: pageData.internalLinks,
						externalLinks: pageData.externalLinks,
					},
					scrapingStatus: PageScrapingStatus.COMPLETED,
					scrapedAt: new Date(),
					wordCount: pageData.wordCount,
				});
			}
		} catch (error) {
			this.logger.error(`Failed to refetch page ${pageId}:`, error);
			await this.onboardingRepository.updatePage(pageId, {
				scrapingStatus: PageScrapingStatus.FAILED,
				scrapingError: error.message,
			});
		}

		return this.onboardingRepository.findPageById(pageId);
	}

	/**
	 * Soft delete a page
	 */
	async deletePage(pageId: string, userId: string): Promise<WebsitePage> {
		const page = await this.onboardingRepository.findPageById(pageId);

		if (!page) {
			throw new NotFoundException('Page not found');
		}

		// Verify ownership through website
		if (page.website?.userId !== userId) {
			throw new NotFoundException('Page not found');
		}

		return this.onboardingRepository.softDeletePage(pageId, userId);
	}
}
