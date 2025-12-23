import { forwardRef, Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module';
import { OpenAiService } from './openai.service';

@Module({
	imports: [
		forwardRef(() => SettingsModule),
	],
	controllers: [],
	providers: [OpenAiService],
	exports: [OpenAiService],
})
export class OpenAiModule { }