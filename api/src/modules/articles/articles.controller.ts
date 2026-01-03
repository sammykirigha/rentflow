import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { JwtPayload } from '@/common/interfaces/jwt-payload.interface';
import {
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	HttpStatus,
	Param,
	Patch,
	Post,
	UseGuards
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { ArticlesService } from './articles.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { EditWithAiDto } from './dto/edit-with-ai.dto';
import { RegenerateTitleDto } from './dto/regenerate-title.dto';
import { UpdateArticleDto } from './dto/update-article.dto';

@ApiTags('Articles')
@Controller('articles')
@ApiSecurity('bearer')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
export class ArticlesController {
	constructor(private readonly articlesService: ArticlesService) { }

	@Get()
	@ApiOperation({ summary: 'Get all articles for current user' })
	@ApiResponse({ status: 200, description: 'Articles retrieved successfully' })
	async getArticles(@CurrentUser() user: JwtPayload) {
		const articles = await this.articlesService.getUserArticles(user.sub);
		return {
			success: true,
			message: 'Articles retrieved successfully',
			data: articles,
		};
	}

	@Get('by-keyword/:keywordId')
	@ApiOperation({ summary: 'Get article by primary keyword ID' })
	@ApiResponse({ status: 200, description: 'Article retrieved successfully' })
	async getArticleByKeyword(
		@Param('keywordId') keywordId: string,
		@CurrentUser() user: JwtPayload,
	) {
		const article = await this.articlesService.getArticleByKeywordId(keywordId, user.sub);
		return {
			success: true,
			message: article ? 'Article found' : 'No article found for this keyword',
			data: article,
		};
	}

	@Get(':id')
	@ApiOperation({ summary: 'Get article by ID' })
	@ApiResponse({ status: 200, description: 'Article retrieved successfully' })
	@ApiResponse({ status: 404, description: 'Article not found' })
	async getArticle(
		@Param('id') articleId: string,
		@CurrentUser() user: JwtPayload,
	) {
		const article = await this.articlesService.getArticleById(articleId, user.sub);
		return {
			success: true,
			message: 'Article retrieved successfully',
			data: article,
		};
	}

	@Post()
	@HttpCode(HttpStatus.CREATED)
	@ApiOperation({ summary: 'Create and generate a new article' })
	@ApiResponse({ status: 201, description: 'Article created and generation started' })
	@ApiResponse({ status: 400, description: 'Bad request' })
	async createArticle(
		@Body() dto: CreateArticleDto,
		@CurrentUser() user: JwtPayload,
	) {
		const article = await this.articlesService.createArticle(user.sub, dto);
		return {
			success: true,
			message: 'Article created and generation started',
			data: article,
		};
	}

	@Post('regenerate-title')
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: 'Regenerate article title using AI' })
	@ApiResponse({ status: 200, description: 'Title regenerated successfully' })
	async regenerateTitle(
		@Body() dto: RegenerateTitleDto,
		@CurrentUser() user: JwtPayload,
	) {
		const result = await this.articlesService.regenerateTitle(user.sub, dto);
		return {
			success: true,
			message: 'Title regenerated successfully',
			data: result,
		};
	}

	@Patch(':id')
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: 'Update an article' })
	@ApiResponse({ status: 200, description: 'Article updated successfully' })
	@ApiResponse({ status: 404, description: 'Article not found' })
	async updateArticle(
		@Param('id') articleId: string,
		@Body() dto: UpdateArticleDto,
		@CurrentUser() user: JwtPayload,
	) {
		const article = await this.articlesService.updateArticle(articleId, user.sub, dto);
		return {
			success: true,
			message: 'Article updated successfully',
			data: article,
		};
	}

	@Post(':id/edit-with-ai')
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: 'Edit article content using AI' })
	@ApiResponse({ status: 200, description: 'AI editing started' })
	@ApiResponse({ status: 404, description: 'Article not found' })
	async editWithAi(
		@Param('id') articleId: string,
		@Body() dto: EditWithAiDto,
		@CurrentUser() user: JwtPayload,
	) {
		const article = await this.articlesService.editWithAi(articleId, user.sub, dto);
		return {
			success: true,
			message: 'AI editing started',
			data: article,
		};
	}

	@Delete(':id')
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: 'Delete an article' })
	@ApiResponse({ status: 200, description: 'Article deleted successfully' })
	@ApiResponse({ status: 404, description: 'Article not found' })
	async deleteArticle(
		@Param('id') articleId: string,
		@CurrentUser() user: JwtPayload,
	) {
		await this.articlesService.deleteArticle(articleId, user.sub);
		return {
			success: true,
			message: 'Article deleted successfully',
		};
	}
}
