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
	 * Perform full scraping of main page and all nested internal pages recursively
	 */
	private async performFullScraping(websiteId: string, websiteUrl: string): Promise<void> {
		const MAX_PAGES_TO_SCRAPE = 350; // Safety limit
		const visitedUrls = new Set<string>();
		const urlQueue: { url: string; depth: number; }[] = [];
		let scrapedCount = 0;
		let totalPagesFound = 1; // Start with main page

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

			// Add homepage URL to visited
			visitedUrls.add(this.normalizeUrl(websiteUrl));

			// Step 2: Add all homepage internal links to the queue
			const homepageInternalLinks = mainPageData.internalLinks || [];
			for (const link of homepageInternalLinks) {
				const normalizedLink = this.normalizeUrl(link);
				if (!visitedUrls.has(normalizedLink)) {
					urlQueue.push({ url: normalizedLink, depth: 1 });
					visitedUrls.add(normalizedLink);
				}
			}

			// Create pending page entries for initial links
			if (homepageInternalLinks.length > 0) {
				const pageEntries: Partial<WebsitePage>[] = homepageInternalLinks.map(link => ({
					websiteId,
					pageUrl: link,
					pagePath: this.extractPath(link),
					scrapingStatus: PageScrapingStatus.PENDING,
					depth: 1,
				}));

				await this.onboardingRepository.createPages(pageEntries);
				totalPagesFound += homepageInternalLinks.length;
			}

			// Step 3: Process queue recursively - scrape all nested pages
			while (urlQueue.length > 0 && scrapedCount < MAX_PAGES_TO_SCRAPE) {
				const { url, depth } = urlQueue.shift()!;

				try {
					const pageData = await this.webScraperService.scrapePage(url, websiteUrl);

					if (pageData) {
						// Update the page record
						const existingPage = await this.onboardingRepository.findPageByUrl(websiteId, url);
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

						// Discover nested internal links and add them to queue
						const nestedInternalLinks = pageData.internalLinks || [];
						const newLinksToAdd: Partial<WebsitePage>[] = [];

						for (const nestedLink of nestedInternalLinks) {
							const normalizedNestedLink = this.normalizeUrl(nestedLink);
							if (!visitedUrls.has(normalizedNestedLink)) {
								// Add to queue for scraping
								urlQueue.push({ url: normalizedNestedLink, depth: depth + 1 });
								visitedUrls.add(normalizedNestedLink);

								// Prepare page entry for database
								newLinksToAdd.push({
									websiteId,
									pageUrl: normalizedNestedLink,
									pagePath: this.extractPath(normalizedNestedLink),
									scrapingStatus: PageScrapingStatus.PENDING,
									depth: depth + 1,
								});
							}
						}

						// Create page entries for newly discovered nested links
						if (newLinksToAdd.length > 0) {
							await this.onboardingRepository.createPages(newLinksToAdd);
							totalPagesFound += newLinksToAdd.length;

							// Update total pages found count
							await this.onboardingRepository.update(
								{ websiteId },
								{ totalPagesFound },
							);
						}
					}
				} catch (error) {
					this.logger.warn(`Failed to scrape page ${url}:`, error.message);
					const existingPage = await this.onboardingRepository.findPageByUrl(websiteId, url);
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

				// Small delay between requests to be polite
				await this.delay(300);
			}

			// Mark as completed
			await this.onboardingRepository.update(
				{ websiteId },
				{
					scrapingStatus: WebsiteScrapingStatus.COMPLETED,
					totalPagesScraped: scrapedCount + 1,
					totalPagesFound,
				},
			);

			this.logger.log(`Completed scraping website ${websiteId}: ${scrapedCount + 1} pages scraped, ${totalPagesFound} total pages found`);

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

	/**
	 * Normalize URL by removing trailing slash and ensuring consistent format
	 */
	private normalizeUrl(url: string): string {
		try {
			const parsed = new URL(url);
			let normalized = parsed.origin + parsed.pathname;
			normalized = normalized.replace(/\/$/, ''); // Remove trailing slash
			return normalized;
		} catch {
			return url;
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
