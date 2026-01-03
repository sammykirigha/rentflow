import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OpenAiModule } from '../openai/openai.module';
import { Keyword } from './entities/keyword.entity';
import { KeywordsController } from './keywords.controller';
import { KeywordsRepository } from './keywords.repository';
import { KeywordsService } from './keywords.service';

@Module({
	imports: [
		TypeOrmModule.forFeature([Keyword]),
		OpenAiModule,
	],
	controllers: [KeywordsController],
	providers: [KeywordsService, KeywordsRepository],
	exports: [KeywordsService, KeywordsRepository],
})
export class KeywordsModule { }
