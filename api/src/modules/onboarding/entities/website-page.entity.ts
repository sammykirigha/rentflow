import { AbstractEntity } from '@/database/abstract.entity';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { UserWebsite } from './user-website.entity';

export enum PageScrapingStatus {
	PENDING = 'pending',
	PROCESSING = 'processing',
	COMPLETED = 'completed',
	FAILED = 'failed',
}

@Entity('website_pages')
export class WebsitePage extends AbstractEntity<WebsitePage> {
	@PrimaryGeneratedColumn('uuid', { name: 'page_id' })
	pageId: string;

	@Column({ name: 'website_id' })
	websiteId: string;

	@Column({ name: 'page_url' })
	pageUrl: string;

	@Column({ name: 'page_path' })
	pagePath: string; // e.g., /blog/about, /products/item-1

	@Column({ name: 'page_title', nullable: true })
	pageTitle?: string;

	@Column({ name: 'page_description', nullable: true, type: 'text' })
	pageDescription?: string;

	@Column({ name: 'scraped_content', nullable: true, type: 'text' })
	scrapedContent?: string;

	@Column({ name: 'scraped_meta', nullable: true, type: 'jsonb' })
	scrapedMeta?: {
		title?: string;
		description?: string;
		keywords?: string[];
		ogImage?: string;
		headings?: string[];
		internalLinks?: string[];
		externalLinks?: string[];
	};

	@Column({
		name: 'scraping_status',
		type: 'enum',
		enum: PageScrapingStatus,
		default: PageScrapingStatus.PENDING,
	})
	scrapingStatus: PageScrapingStatus;

	@Column({ name: 'scraping_error', nullable: true, type: 'text' })
	scrapingError?: string;

	@Column({ name: 'scraped_at', nullable: true })
	scrapedAt?: Date;

	@Column({ name: 'depth', default: 1 })
	depth: number; // How deep from the main page (1 = direct link from homepage)

	@Column({ name: 'word_count', nullable: true })
	wordCount?: number;

	// Soft delete fields
	@Column({ name: 'deleted_at', nullable: true })
	deletedAt?: Date;

	@Column({ name: 'deleted_by', nullable: true })
	deletedBy?: string;

	// Relations
	@ManyToOne(() => UserWebsite, website => website.pages, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'website_id' })
	website: UserWebsite;
}
