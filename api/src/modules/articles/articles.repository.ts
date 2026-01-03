import { AbstractRepository } from '@/database/abstract.repository';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Article, ArticleStatus } from './entities/article.entity';

@Injectable()
export class ArticlesRepository extends AbstractRepository<Article> {
	constructor(
		@InjectRepository(Article)
		articlesRepository: Repository<Article>,
	) {
		super(articlesRepository);
	}

	async findByUserId(userId: string): Promise<Article[]> {
		return this.repository.find({
			where: { userId },
			relations: ['primaryKeyword', 'secondaryKeywords', 'aiModel'],
			order: { createdAt: 'DESC' },
		});
	}

	async findByPrimaryKeywordId(primaryKeywordId: string): Promise<Article | null> {
		return this.repository.findOne({
			where: { primaryKeywordId },
			relations: ['primaryKeyword', 'secondaryKeywords', 'aiModel'],
		});
	}

	async findByIdWithRelations(articleId: string): Promise<Article | null> {
		return this.repository.findOne({
			where: { articleId },
			relations: ['primaryKeyword', 'secondaryKeywords', 'aiModel', 'user'],
		});
	}

	async findByUserIdAndKeywordId(userId: string, primaryKeywordId: string): Promise<Article | null> {
		return this.repository.findOne({
			where: { userId, primaryKeywordId },
			relations: ['primaryKeyword', 'secondaryKeywords', 'aiModel'],
		});
	}

	async updateStatus(articleId: string, status: ArticleStatus, error?: string): Promise<Article> {
		await this.repository.update(articleId, {
			status,
			generationError: error || null,
		});
		return this.findByIdWithRelations(articleId);
	}

	async updateContent(
		articleId: string,
		content: string,
		contentJson: object,
		tokenUsage: { inputTokens?: number; outputTokens?: number; totalTokens?: number; },
	): Promise<Article> {
		const wordCount = content ? content.split(/\s+/).filter(Boolean).length : 0;

		await this.repository.update(articleId, {
			content,
			contentJson,
			tokenUsage,
			wordCount,
			status: ArticleStatus.GENERATED,
			generatedAt: new Date(),
		});

		return this.findByIdWithRelations(articleId);
	}
}
