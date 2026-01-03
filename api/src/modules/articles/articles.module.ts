import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Keyword } from '../keywords/entities/keyword.entity';
import { OpenAiModule } from '../openai/openai.module';
import { SettingsModule } from '../settings/settings.module';
import { ArticlesController } from './articles.controller';
import { ArticlesRepository } from './articles.repository';
import { ArticlesService } from './articles.service';
import { Article } from './entities/article.entity';

@Module({
	imports: [
		TypeOrmModule.forFeature([Article, Keyword]),
		OpenAiModule,
		SettingsModule,
	],
	controllers: [ArticlesController],
	providers: [ArticlesService, ArticlesRepository],
	exports: [ArticlesService],
})
export class ArticlesModule { }
