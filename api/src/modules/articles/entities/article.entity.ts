import { AbstractEntity } from '@/database/abstract.entity';
import { Keyword } from '@/modules/keywords/entities/keyword.entity';
import { AiModelConfiguration } from '@/modules/settings/entities/ai-model-configuration.entity';
import { User } from '@/modules/users/entities/user.entity';
import { Column, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

export enum ArticleStatus {
	DRAFT = 'draft',
	GENERATING = 'generating',
	GENERATED = 'generated',
	PUBLISHED = 'published',
	FAILED = 'failed',
}

@Entity('articles')
export class Article extends AbstractEntity<Article> {
	@PrimaryGeneratedColumn('uuid', { name: 'article_id' })
	articleId: string;

	@Column({ name: 'user_id' })
	userId: string;

	@Column()
	title: string;

	@Column({ type: 'text', nullable: true })
	content: string;

	@Column({ name: 'content_json', type: 'json', nullable: true })
	contentJson: object;

	@Column({ name: 'content_briefing', type: 'text', nullable: true })
	contentBriefing: string;

	@Column({ name: 'reference_content', type: 'text', nullable: true })
	referenceContent: string;

	@Column({ name: 'primary_keyword_id' })
	primaryKeywordId: string;

	@Column({ name: 'ai_model_id', nullable: true })
	aiModelId: string;

	@Column({
		type: 'enum',
		enum: ArticleStatus,
		default: ArticleStatus.DRAFT,
	})
	status: ArticleStatus;

	@Column({ name: 'generation_error', type: 'text', nullable: true })
	generationError: string;

	@Column({ name: 'token_usage', type: 'json', nullable: true })
	tokenUsage: {
		inputTokens?: number;
		outputTokens?: number;
		totalTokens?: number;
	};

	@Column({ name: 'word_count', type: 'int', default: 0 })
	wordCount: number;

	@Column({ name: 'generated_at', type: 'timestamp', nullable: true })
	generatedAt: Date;

	// Relations
	@ManyToOne(() => User, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'user_id' })
	user: User;

	@ManyToOne(() => Keyword, { onDelete: 'SET NULL', nullable: true })
	@JoinColumn({ name: 'primary_keyword_id' })
	primaryKeyword: Keyword;

	@ManyToMany(() => Keyword)
	@JoinTable({
		name: 'article_secondary_keywords',
		joinColumn: { name: 'article_id', referencedColumnName: 'articleId' },
		inverseJoinColumn: { name: 'keyword_id', referencedColumnName: 'keywordId' },
	})
	secondaryKeywords: Keyword[];

	@ManyToOne(() => AiModelConfiguration, { onDelete: 'SET NULL', nullable: true })
	@JoinColumn({ name: 'ai_model_id' })
	aiModel: AiModelConfiguration;
}
