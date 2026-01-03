import { AbstractRepository } from '@/database/abstract.repository';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Keyword } from './entities/keyword.entity';

@Injectable()
export class KeywordsRepository extends AbstractRepository<Keyword> {
	constructor(
		@InjectRepository(Keyword)
		private readonly keywordRepository: Repository<Keyword>,
	) {
		super(keywordRepository);
	}

	async findByUserId(userId: string): Promise<Keyword[]> {
		return this.keywordRepository.find({
			where: { userId },
			order: { createdAt: 'DESC' },
		});
	}

	async findByUserIdAndKeyword(userId: string, keyword: string): Promise<Keyword | null> {
		return this.keywordRepository.findOne({
			where: { userId, keyword },
		});
	}

	async findUnanalyzedKeywords(userId: string): Promise<Keyword[]> {
		return this.keywordRepository.find({
			where: { userId, isAnalyzed: false },
		});
	}
}
