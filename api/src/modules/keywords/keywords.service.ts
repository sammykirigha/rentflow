import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { OpenAiService } from '../openai/openai.service';
import { CreateKeywordsDto } from './dto/create-keyword.dto';
import { Keyword } from './entities/keyword.entity';
import { KeywordsRepository } from './keywords.repository';

interface KeywordAnalysis {
	keyword: string;
	difficulty: number;
	volume: number;
	trend: string;
	recommendedTitle: string;
}

@Injectable()
export class KeywordsService {
	private readonly logger = new Logger(KeywordsService.name);

	constructor(
		private readonly keywordsRepository: KeywordsRepository,
		private readonly openAiService: OpenAiService,
	) { }

	async createKeywords(userId: string, createKeywordsDto: CreateKeywordsDto): Promise<Keyword[]> {
		const { keywords } = createKeywordsDto;
		const createdKeywords: Keyword[] = [];
		const keywordsToAnalyze: Keyword[] = [];

		// Filter out duplicates based on keyword text
		const seen = new Set<string>();
		const uniqueKeywords = keywords.filter(k => {
			const normalized = k.keyword.trim().toLowerCase();
			if (seen.has(normalized)) return false;
			seen.add(normalized);
			return true;
		});

		await Promise.all(uniqueKeywords.map(async keywordItem => {
			const normalizedKeyword = keywordItem.keyword.trim().toLowerCase();
			// Check if keyword already exists for this user
			const existing = await this.keywordsRepository.findByUserIdAndKeyword(userId, normalizedKeyword);
			if (existing) {
				this.logger.warn(`Keyword "${normalizedKeyword}" already exists for user ${userId}`);
				return;
			}

			// Check if difficulty and volume are provided (from CSV/Excel upload)
			const hasPrefilledData = keywordItem.difficulty !== undefined && keywordItem.volume !== undefined;
			// Default to primary if not specified
			const isPrimary = keywordItem.isPrimary ?? true;

			// Create the keyword entry
			const newKeyword = await this.keywordsRepository.create({
				userId,
				keyword: normalizedKeyword,
				difficulty: keywordItem.difficulty ?? 50,
				volume: keywordItem.volume ?? 0,
				isAnalyzed: hasPrefilledData, // Mark as analyzed if data is provided
				isPrimary,
				parentKeywordId: keywordItem.parentKeywordId ?? null,
			});
			createdKeywords.push(newKeyword);

			// Only analyze primary keywords that don't have prefilled data
			// Secondary keywords skip title generation
			if (!hasPrefilledData && isPrimary) {
				keywordsToAnalyze.push(newKeyword);
			} else if (!hasPrefilledData && !isPrimary) {
				// For secondary keywords, analyze without title generation
				this.analyzeSecondaryKeywordInBackground(newKeyword);
			}
		}));

		// Analyze primary keywords without prefilled data in background (don't await)
		if (keywordsToAnalyze.length > 0) {
			this.analyzeKeywordsInBackground(keywordsToAnalyze);
		}

		return createdKeywords;
	}

	private async analyzeKeywordsInBackground(keywords: Keyword[]): Promise<void> {
		await Promise.all(keywords.map(async keyword => {
			try {
				await this.analyzeKeyword(keyword);
			} catch (error) {
				this.logger.error(`Failed to analyze keyword "${keyword.keyword}": ${error.message}`);
			}
		}));
	}

	async analyzeKeyword(keyword: Keyword): Promise<Keyword> {
		try {
			const analysis = await this.getKeywordAnalysis(keyword.keyword);

			// Update the keyword with analysis data
			const updated = await this.keywordsRepository.update(
				{ keywordId: keyword.keywordId },
				{
					difficulty: analysis.difficulty,
					volume: analysis.volume,
					recommendedTitle: analysis.recommendedTitle,
					aiAnalysis: {
						difficultyScore: analysis.difficulty,
						volumeEstimate: analysis.volume,
						trend: analysis.trend,
					},
					isAnalyzed: true,
				}
			);

			return updated;
		} catch (error) {
			this.logger.error(`Error analyzing keyword "${keyword.keyword}": ${error.message}`);
			throw error;
		}
	}

	private async getKeywordAnalysis(keyword: string): Promise<KeywordAnalysis> {
		const prompt = `You are an SEO expert. Analyze the following keyword and provide realistic SEO metrics.

			Keyword: "${keyword}"

			Provide a JSON response with the following structure:
			{
				"difficulty": number (0-100, where 0 is easiest to rank and 100 is hardest),
				"volume": number (estimated monthly search volume on Google - be realistic based on the keyword's popularity),
				"trend": "rising" | "stable" | "declining",
				"recommendedTitle": "A compelling SEO-optimized article title for this keyword (max 60 characters)"
			}

			Important:
			- For difficulty, estimate how hard it is to rank on Google's first page (0-100 scale)
			  - 0-30: Easy to rank (low competition keywords)
			  - 31-60: Moderate difficulty
			  - 61-80: Hard to rank
			  - 81-100: Very hard to rank (highly competitive keywords)
			- For volume, estimate realistic monthly search volumes based on the keyword's nature
			- Popular topics should have higher volumes (thousands to millions)
			- Niche topics should have lower volumes (hundreds to low thousands)
			- The recommended title should be engaging and include the keyword naturally

			Return ONLY valid JSON, no additional text.`;

		try {
			const response = await this.openAiService.chat([
				{ role: 'user', content: prompt }
			] as any);

			// Parse the JSON response
			const jsonMatch = response.content.match(/\{[\s\S]*\}/);
			if (!jsonMatch) {
				throw new Error('No valid JSON found in AI response');
			}

			const analysis = JSON.parse(jsonMatch[0]);

			// Validate and normalize the response
			return {
				keyword,
				difficulty: Math.min(100, Math.max(0, Math.round(analysis.difficulty ?? 50))),
				volume: Math.max(0, Math.round(analysis.volume || 0)),
				trend: analysis.trend || 'stable',
				recommendedTitle: analysis.recommendedTitle || `Guide to ${keyword}`,
			};
		} catch (error) {
			this.logger.error(`AI analysis failed for keyword "${keyword}": ${error.message}`);
			// Return default values on failure
			return {
				keyword,
				difficulty: 50,
				volume: 1000,
				trend: 'stable',
				recommendedTitle: `Complete Guide to ${keyword}`,
			};
		}
	}

	async findAllByUser(userId: string): Promise<Keyword[]> {
		return this.keywordsRepository.findByUserId(userId);
	}

	async findOne(keywordId: string, userId: string): Promise<Keyword> {
		const keyword = await this.keywordsRepository.findOne({
			where: { keywordId, userId },
		});

		if (!keyword) {
			throw new NotFoundException('Keyword not found');
		}

		return keyword;
	}

	async reanalyzeKeyword(keywordId: string, userId: string): Promise<Keyword> {
		const keyword = await this.findOne(keywordId, userId);
		return this.analyzeKeyword(keyword);
	}

	async deleteKeyword(keywordId: string, userId: string): Promise<void> {
		const keyword = await this.findOne(keywordId, userId);
		await this.keywordsRepository.delete(keyword.keywordId);
	}

	async deleteMultipleKeywords(keywordIds: string[], userId: string): Promise<void> {
		for (const keywordId of keywordIds) {
			await this.deleteKeyword(keywordId, userId);
		}
	}

	// Analyze secondary keyword (difficulty and volume only, no title)
	private async analyzeSecondaryKeywordInBackground(keyword: Keyword): Promise<void> {
		try {
			const analysis = await this.getKeywordAnalysisWithoutTitle(keyword.keyword);

			await this.keywordsRepository.update(
				{ keywordId: keyword.keywordId },
				{
					difficulty: analysis.difficulty,
					volume: analysis.volume,
					aiAnalysis: {
						difficultyScore: analysis.difficulty,
						volumeEstimate: analysis.volume,
						trend: analysis.trend,
					},
					isAnalyzed: true,
				}
			);
		} catch (error) {
			this.logger.error(`Failed to analyze secondary keyword "${keyword.keyword}": ${error.message}`);
		}
	}

	// Get keyword analysis without title generation (for secondary keywords)
	private async getKeywordAnalysisWithoutTitle(keyword: string): Promise<Omit<KeywordAnalysis, 'recommendedTitle'>> {
		const prompt = `You are an SEO expert. Analyze the following keyword and provide realistic SEO metrics.

			Keyword: "${keyword}"

			Provide a JSON response with the following structure:
			{
				"difficulty": number (0-100, where 0 is easiest to rank and 100 is hardest),
				"volume": number (estimated monthly search volume on Google - be realistic based on the keyword's popularity),
				"trend": "rising" | "stable" | "declining"
			}

			Important:
			- For difficulty, estimate how hard it is to rank on Google's first page (0-100 scale)
			  - 0-30: Easy to rank (low competition keywords)
			  - 31-60: Moderate difficulty
			  - 61-80: Hard to rank
			  - 81-100: Very hard to rank (highly competitive keywords)
			- For volume, estimate realistic monthly search volumes based on the keyword's nature
			- Popular topics should have higher volumes (thousands to millions)
			- Niche topics should have lower volumes (hundreds to low thousands)

			Return ONLY valid JSON, no additional text.`;

		try {
			const response = await this.openAiService.chat([
				{ role: 'user', content: prompt }
			] as any);

			const jsonMatch = response.content.match(/\{[\s\S]*\}/);
			if (!jsonMatch) {
				throw new Error('No valid JSON found in AI response');
			}

			const analysis = JSON.parse(jsonMatch[0]);

			return {
				keyword,
				difficulty: Math.min(100, Math.max(0, Math.round(analysis.difficulty ?? 50))),
				volume: Math.max(0, Math.round(analysis.volume || 0)),
				trend: analysis.trend || 'stable',
			};
		} catch (error) {
			this.logger.error(`AI analysis failed for secondary keyword "${keyword}": ${error.message}`);
			return {
				keyword,
				difficulty: 50,
				volume: 1000,
				trend: 'stable',
			};
		}
	}

	// Update keyword primary status
	async updatePrimaryStatus(keywordId: string, userId: string, isPrimary: boolean): Promise<Keyword> {
		const keyword = await this.findOne(keywordId, userId);

		// If changing from secondary to primary, generate title if not already present
		if (isPrimary && !keyword.isPrimary && !keyword.recommendedTitle) {
			// Analyze and generate title for the newly promoted keyword
			await this.keywordsRepository.update(
				{ keywordId: keyword.keywordId },
				{ isPrimary: true }
			);
			return this.analyzeKeyword({ ...keyword, isPrimary: true });
		}

		const updated = await this.keywordsRepository.update(
			{ keywordId: keyword.keywordId },
			{ isPrimary }
		);

		return updated;
	}

	// Update parent keyword for a secondary keyword
	async updateParentKeyword(keywordId: string, userId: string, parentKeywordId: string | null): Promise<Keyword> {
		const keyword = await this.findOne(keywordId, userId);

		// Can only assign parent to secondary keywords
		if (keyword.isPrimary) {
			throw new Error('Cannot assign a parent keyword to a primary keyword');
		}

		// Validate parent keyword exists and belongs to user if parentKeywordId is provided
		if (parentKeywordId) {
			const parentKeyword = await this.findOne(parentKeywordId, userId);
			if (!parentKeyword.isPrimary) {
				throw new Error('Parent keyword must be a primary keyword');
			}
		}

		const updated = await this.keywordsRepository.update(
			{ keywordId: keyword.keywordId },
			{ parentKeywordId }
		);

		return updated;
	}

	// Get all primary keywords for a user (for dropdown selection)
	async getPrimaryKeywords(userId: string): Promise<Keyword[]> {
		return this.keywordsRepository.findAll({
			where: { userId, isPrimary: true },
			order: { keyword: 'ASC' },
		});
	}

	// Bulk update primary status for multiple keywords
	async bulkUpdatePrimaryStatus(keywordIds: string[], userId: string, isPrimary: boolean): Promise<Keyword[]> {
		const updatedKeywords: Keyword[] = [];

		for (const keywordId of keywordIds) {
			try {
				const updated = await this.updatePrimaryStatus(keywordId, userId, isPrimary);
				updatedKeywords.push(updated);
			} catch (error) {
				this.logger.error(`Failed to update primary status for keyword ${keywordId}: ${error.message}`);
			}
		}

		return updatedKeywords;
	}

	// Bulk update parent keyword for multiple secondary keywords
	async bulkUpdateParentKeyword(keywordIds: string[], userId: string, parentKeywordId: string | null): Promise<Keyword[]> {
		const updatedKeywords = await Promise.all(keywordIds.map(async (keywordId) => {
			try {
				return await this.updateParentKeyword(keywordId, userId, parentKeywordId);
			} catch (error) {
				this.logger.error(`Failed to update parent keyword for keyword ${keywordId}: ${error.message}`);
			}
		}));

		return updatedKeywords;
	}
}
