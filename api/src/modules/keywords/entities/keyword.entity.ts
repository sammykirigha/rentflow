import { AbstractEntity } from '@/database/abstract.entity';
import { User } from '@/modules/users/entities/user.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity('keywords')
@Index(['userId', 'keyword'], { unique: true })
export class Keyword extends AbstractEntity<Keyword> {
	@PrimaryGeneratedColumn('uuid', { name: 'keyword_id' })
	keywordId: string;

	@Column({ name: 'user_id' })
	userId: string;

	@Column()
	keyword: string;

	@Column({ type: 'int', default: 50 })
	difficulty: number;

	@Column({ type: 'int', default: 0 })
	volume: number;

	@Column({ name: 'recommended_title', nullable: true, type: 'text' })
	recommendedTitle: string;

	@Column({ name: 'ai_analysis', nullable: true, type: 'json' })
	aiAnalysis: {
		difficultyScore?: number;
		volumeEstimate?: number;
		trend?: string;
	};

	@Column({ name: 'is_analyzed', default: false })
	isAnalyzed: boolean;

	@Column({ name: 'is_primary', default: true })
	isPrimary: boolean;

	@Column({ name: 'parent_keyword_id', nullable: true })
	parentKeywordId: string | null;

	@ManyToOne(() => Keyword, (keyword) => keyword.secondaryKeywords, { onDelete: 'SET NULL', nullable: true })
	@JoinColumn({ name: 'parent_keyword_id' })
	parentKeyword: Keyword | null;

	@OneToMany(() => Keyword, (keyword) => keyword.parentKeyword)
	secondaryKeywords: Keyword[];

	@ManyToOne(() => User, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'user_id' })
	user: User;
}
