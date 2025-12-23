import { Module } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import { winstonConfig } from './winston.config';
import { LoggingService } from './logging.service';

@Module({
  imports: [
    WinstonModule.forRoot(winstonConfig)
  ],
  providers: [LoggingService],
  exports: [LoggingService]
})
export class LoggingModule {}
