import { AbstractRepository } from '@/database/abstract.repository';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { UserWebsite } from './entities/user-website.entity';
import { WebsitePage } from './entities/website-page.entity';

@Injectable()
export class OnboardingRepository extends AbstractRepository<UserWebsite> {
	constructor(
		@InjectRepository(UserWebsite)
		private readonly userWebsiteRepository: Repository<UserWebsite>,
		@InjectRepository(WebsitePage)
		private readonly websitePageRepository: Repository<WebsitePage>,
	) {
		super(userWebsiteRepository);
	}

	async findByUserId(userId: string): Promise<UserWebsite[]> {
		return this.userWebsiteRepository.find({
			where: { userId },
			order: { createdAt: 'DESC' },
		});
	}

	async findPrimaryByUserId(userId: string): Promise<UserWebsite | null> {
		return this.userWebsiteRepository.findOne({
			where: { userId, isPrimary: true },
		});
	}

	async findWebsiteWithPages(websiteId: string): Promise<UserWebsite | null> {
		return this.userWebsiteRepository.findOne({
			where: { websiteId },
			relations: ['pages'],
		});
	}

	// Website Pages methods
	async createPage(data: Partial<WebsitePage>): Promise<WebsitePage> {
		const page = this.websitePageRepository.create(data);
		return this.websitePageRepository.save(page);
	}

	async createPages(pages: Partial<WebsitePage>[]): Promise<WebsitePage[]> {
		const entities = this.websitePageRepository.create(pages);
		return this.websitePageRepository.save(entities);
	}

	async updatePage(pageId: string, data: Partial<WebsitePage>): Promise<WebsitePage | null> {
		await this.websitePageRepository.update({ pageId }, data);
		return this.websitePageRepository.findOne({ where: { pageId } });
	}

	async findPagesByWebsiteId(websiteId: string): Promise<WebsitePage[]> {
		return this.websitePageRepository.find({
			where: { websiteId },
			order: { depth: 'ASC', createdAt: 'ASC' },
		});
	}

	// Find non-deleted pages for a website
	async findActivePagesByWebsiteId(websiteId: string): Promise<WebsitePage[]> {
		return this.websitePageRepository.find({
			where: { websiteId, deletedAt: IsNull() },
			order: { depth: 'ASC', createdAt: 'ASC' },
		});
	}

	// Find all non-deleted pages for a user (across all their websites)
	async findActivePagesByUserId(userId: string): Promise<WebsitePage[]> {
		return this.websitePageRepository
			.createQueryBuilder('page')
			.innerJoin('page.website', 'website')
			.where('website.userId = :userId', { userId })
			.andWhere('page.deletedAt IS NULL')
			.orderBy('page.createdAt', 'DESC')
			.getMany();
	}

	async findPageById(pageId: string): Promise<WebsitePage | null> {
		return this.websitePageRepository.findOne({
			where: { pageId },
			relations: ['website'],
		});
	}

	async findPageByUrl(websiteId: string, pageUrl: string): Promise<WebsitePage | null> {
		return this.websitePageRepository.findOne({
			where: { websiteId, pageUrl },
		});
	}

	async countPagesByWebsiteId(websiteId: string): Promise<number> {
		return this.websitePageRepository.count({
			where: { websiteId },
		});
	}

	async countScrapedPagesByWebsiteId(websiteId: string): Promise<number> {
		return this.websitePageRepository.count({
			where: { websiteId, scrapingStatus: 'completed' as any },
		});
	}

	async getPageStats(websiteId: string): Promise<{
		total: number;
		completed: number;
		pending: number;
		failed: number;
	}> {
		const pages = await this.websitePageRepository.find({
			where: { websiteId },
			select: ['scrapingStatus'],
		});

		return {
			total: pages.length,
			completed: pages.filter(p => p.scrapingStatus === 'completed').length,
			pending: pages.filter(p => p.scrapingStatus === 'pending' || p.scrapingStatus === 'processing').length,
			failed: pages.filter(p => p.scrapingStatus === 'failed').length,
		};
	}

	// Soft delete a page
	async softDeletePage(pageId: string, deletedBy: string): Promise<WebsitePage | null> {
		await this.websitePageRepository.update(
			{ pageId },
			{ deletedAt: new Date(), deletedBy },
		);
		return this.websitePageRepository.findOne({ where: { pageId } });
	}
}
