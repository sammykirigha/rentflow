import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json, urlencoded } from 'express';
import { WinstonModule } from 'nest-winston';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { winstonConfig } from './modules/logging/winston.config';

async function bootstrap() {
	const logger = WinstonModule.createLogger(winstonConfig);
	const app = await NestFactory.create(AppModule, {
		logger,
		rawBody: true, // Enable raw body for Stripe webhooks
	});

	const configService = app.get(ConfigService);

	// Configure body parser with raw body for webhooks
	app.use(
		json({
			verify: (req: any, res, buf) => {
				// Store raw body for webhook verification
				if (req.url?.startsWith('/api/v1/webhooks/stripe')) {
					req.rawBody = buf;
				}
			},
		}),
	);
	app.use(urlencoded({ extended: true }));

	// Enable CORS
	app.enableCors({
		origin: [
			configService.get<string>('FRONTEND_URL', 'http://localhost:3001'),
			'http://localhost:3001',
			'http://localhost:3000',
			'https://ai.edutized.com'
		],
		credentials: true,
		methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
		allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
	});

	// Global validation pipe
	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			forbidNonWhitelisted: true,
			transform: true,
			transformOptions: {
				enableImplicitConversion: true,
			},
		}),
	);

	app.useGlobalFilters(new HttpExceptionFilter());
	// Global interceptors
	app.useGlobalInterceptors(new LoggingInterceptor());

	// Set global prefix
	const PREFIX = configService.get<string>('API_PREFIX', 'api/v1');
	app.setGlobalPrefix(PREFIX);

	// Swagger Documentation
	const config = new DocumentBuilder()
		.setTitle('Masomo Dash API')
		.setDescription('Educational Materials Marketplace API')
		.setVersion('1.0')
		.addTag('Auth', 'Authentication endpoints')
		.addTag('Users', 'User management')
		.addTag('Papers', 'Paper management')
		.addTag('Credits', 'Credit wallet and purchases')
		.addTag('Admin', 'Admin operations')
		.addBearerAuth({
			type: 'http',
			scheme: 'bearer',
			bearerFormat: 'JWT',
			name: 'JWT',
			description: 'Enter JWT token',
			in: 'header',
		}, 'JWT')
		.build();

	const documentFactory = () => SwaggerModule.createDocument(app, config);
	SwaggerModule.setup('api/docs', app, documentFactory);

	const PORT = configService.get<number>('PORT', 3000);
	await app.listen(PORT);

	console.log(`🚀 Application is running on: http://localhost:${PORT}/${PREFIX}`);
	console.log(`📚 Swagger docs available at: http://localhost:${PORT}/api/docs`);
}

process.on('uncaughtException', (error) => {
	const logger = WinstonModule.createLogger(winstonConfig);
	logger.error('Uncaught Exception', {
		error: error.message,
		stack: error.stack
	});
});

process.on('unhandledRejection', (reason, promise) => {
	console.log('Unhandled Rejection', reason, promise);

	const logger = WinstonModule.createLogger(winstonConfig);
	logger.error('Unhandled Rejection', {
		reason,
		promise
	});
});

bootstrap();