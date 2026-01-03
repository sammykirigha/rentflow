import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtPayload } from '@/common/interfaces/jwt-payload.interface';
import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CreateKeywordsDto } from './dto/create-keyword.dto';
import { KeywordsService } from './keywords.service';

@Controller('keywords')
@UseGuards(AuthGuard('jwt'))
export class KeywordsController {
	constructor(private readonly keywordsService: KeywordsService) { }

	@Post()
	async createKeywords(
		@CurrentUser() user: JwtPayload,
		@Body() createKeywordsDto: CreateKeywordsDto,
	) {
		return await this.keywordsService.createKeywords(user.sub, createKeywordsDto);
	}

	@Get()
	async findAll(@CurrentUser() user: JwtPayload) {
		return await this.keywordsService.findAllByUser(user.sub);
	}

	@Get(':keywordId')
	async findOne(
		@CurrentUser() user: JwtPayload,
		@Param('keywordId') keywordId: string,
	) {
		return await this.keywordsService.findOne(keywordId, user.sub);
	}

	@Put(':keywordId/reanalyze')
	async reanalyzeKeyword(
		@CurrentUser() user: JwtPayload,
		@Param('keywordId') keywordId: string,
	) {
		return await this.keywordsService.reanalyzeKeyword(keywordId, user.sub);
	}

	@Put(':keywordId/primary')
	async updatePrimaryStatus(
		@CurrentUser() user: JwtPayload,
		@Param('keywordId') keywordId: string,
		@Body('isPrimary') isPrimary: boolean,
	) {
		return await this.keywordsService.updatePrimaryStatus(keywordId, user.sub, isPrimary);
	}

	@Put(':keywordId/parent')
	async updateParentKeyword(
		@CurrentUser() user: JwtPayload,
		@Param('keywordId') keywordId: string,
		@Body('parentKeywordId') parentKeywordId: string | null,
	) {
		return await this.keywordsService.updateParentKeyword(keywordId, user.sub, parentKeywordId);
	}

	@Get('primary/list')
	async getPrimaryKeywords(@CurrentUser() user: JwtPayload) {
		return await this.keywordsService.getPrimaryKeywords(user.sub);
	}

	@Delete(':keywordId')
	async deleteKeyword(
		@CurrentUser() user: JwtPayload,
		@Param('keywordId') keywordId: string,
	) {
		await this.keywordsService.deleteKeyword(keywordId, user.sub);
		return true;
	}

	@Post('delete-multiple')
	async deleteMultipleKeywords(
		@CurrentUser() user: JwtPayload,
		@Body('keywordIds') keywordIds: string[],
	) {
		await this.keywordsService.deleteMultipleKeywords(keywordIds, user.sub);
		return true;
	}

	@Post('bulk-primary')
	async bulkUpdatePrimaryStatus(
		@CurrentUser() user: JwtPayload,
		@Body('keywordIds') keywordIds: string[],
		@Body('isPrimary') isPrimary: boolean,
	) {
		return await this.keywordsService.bulkUpdatePrimaryStatus(keywordIds, user.sub, isPrimary);
	}

	@Post('bulk-parent')
	async bulkUpdateParentKeyword(
		@CurrentUser() user: JwtPayload,
		@Body('keywordIds') keywordIds: string[],
		@Body('parentKeywordId') parentKeywordId: string | null,
	) {
		return await this.keywordsService.bulkUpdateParentKeyword(keywordIds, user.sub, parentKeywordId);
	}
}
