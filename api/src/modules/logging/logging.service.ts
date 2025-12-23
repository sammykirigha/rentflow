import { Injectable, Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Injectable()
export class LoggingService implements LoggerService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger
  ) {}

  log(message: string, context?: string, metadata?: Record<string, any>) {
    this.logger.info(message, {
      context,
      ...metadata
    });
  }

  error(message: string, trace?: string, context?: string) {
    this.logger.error(message, {
      trace,
      context
    });
  }

  warn(message: string, context?: string) {
    this.logger.warn(message, { context });
  }

  debug(message: string, context?: string) {
    this.logger.debug(message, { context });
  }

  verbose(message: string, context?: string) {
    this.logger.verbose(message, { context });
  }

  info(message: string, context?: string) {
    this.logger.info(message, { context });
  }
}
