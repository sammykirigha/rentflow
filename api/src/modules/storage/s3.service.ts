import { FileResponse } from '@/common/interfaces/file-response.interface';
import {
	DeleteObjectCommand,
	GetObjectCommand,
	PutObjectCommand,
	S3Client
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid';

export async function streamToBuffer(stream: Readable): Promise<Buffer> {
	const chunks: any[] = [];
	return new Promise((resolve, reject) => {
		stream.on('data', (chunk) => chunks.push(chunk));
		stream.on('error', reject);
		stream.on('end', () => resolve(Buffer.concat(chunks)));
	});
}

@Injectable()
export class S3Service {
	private readonly s3Client: S3Client;
	private readonly bucketName: string;
	private readonly logger = new Logger(S3Service.name);

	constructor(private configService: ConfigService) {
		this.s3Client = new S3Client({
			region: this.configService.get('AWS_REGION'),
			credentials: {
				accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
				secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
			},
		});
		this.bucketName = this.configService.get('AWS_S3_BUCKET');
	}

	async uploadFile(file: Express.Multer.File, folder: string = 'uploads'): Promise<{ key: string; url: string; }> {
		const key = `${folder}/${uuidv4()}-${file.originalname}`;

		try {
			const command = new PutObjectCommand({
				Bucket: this.bucketName,
				Key: key,
				Body: file.buffer,
				ContentType: file.mimetype,
				ServerSideEncryption: 'AES256', // Enable server-side encryption
				Metadata: {
					originalName: file.originalname,
					uploadedAt: new Date().toISOString(),
				},
			});

			await this.s3Client.send(command);

			const url = `https://${this.bucketName}.s3.${this.configService.get('AWS_REGION')}.amazonaws.com/${key}`;

			this.logger.log(`File uploaded successfully: ${key}`);
			return { key, url };
		} catch (error) {
			console.log(error);
			
			this.logger.error(`Failed to upload file: ${error.message}`);
			throw error;
		}
	}

	async uploadFiles(files: Express.Multer.File[], folder: string = 'uploads'): Promise<{ key: string; url: string; }[]> {
		const uploadPromises = files.map((file) => this.uploadFile(file, folder));
		return Promise.all(uploadPromises);
	}

	async uploadFileBuffer(buffer: Buffer<ArrayBufferLike>, options: {folder?: string, originalName?: string, mimetype: string }) {
		const key = `${options.folder||"uploads"}/${uuidv4()}-${options.originalName||"file"}`;

		try {
			const command = new PutObjectCommand({
				Bucket: this.bucketName,
				Key: key,
				Body: buffer,
				ContentType: options.mimetype,
				ServerSideEncryption: 'AES256', // Enable server-side encryption
				Metadata: {
					originalName: options.originalName,
					uploadedAt: new Date().toISOString(),
				},
			});

			await this.s3Client.send(command);

			const url = `https://${this.bucketName}.s3.${this.configService.get('AWS_REGION')}.amazonaws.com/${key}`;

			this.logger.log(`File uploaded successfully: ${key}`);
			return { key, url };
		} catch (error) {
			this.logger.error(`Failed to upload file: ${error.message}`);
			throw error;
		}
	}

	async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
		try {
			const command = new GetObjectCommand({
				Bucket: this.bucketName,
				Key: key,
			});

			const signedUrl = await getSignedUrl(this.s3Client, command, {
				expiresIn,
			});

			return signedUrl;
		} catch (error) {
			this.logger.error(`Failed to generate signed URL: ${error.message}`);
			throw error;
		}
	}

	async deleteFile(key: string): Promise<void> {
		try {
			const command = new DeleteObjectCommand({
				Bucket: this.bucketName,
				Key: key,
			});

			await this.s3Client.send(command);
			this.logger.log(`File deleted successfully: ${key}`);
		} catch (error) {
			this.logger.error(`Failed to delete file: ${error.message}`);
			throw error;
		}
	}

	async getFile(key: string): Promise<FileResponse | null> {
		try {
			const command = new GetObjectCommand({
				Bucket: this.bucketName,
				Key: key,
			});

			const response = await this.s3Client.send(command);
			if (response && response.$metadata.httpStatusCode === 200 && response.Body instanceof Readable) {
				const fileResponse: FileResponse = {
					metaData: {
						originalFilename: response.Metadata ? response.Metadata['original-filename'] : undefined,
						contentType: response.ContentType || 'application/octet-stream',
						contentLength: response.ContentLength || 0,
						contentDisposition: response.ContentDisposition || undefined
					},
					fileStream: response.Body as Readable
				};

				return fileResponse;
			}
		} catch (error) {
		}
		return null;
	}

	async getFileBuffer(filePath: string): Promise<{ file: Buffer | null, mimeType: string | null, originalFilename?: string; } | null> {
		const file = await this.getFile(filePath);
		if (!file)
			return null;
		return { file: await streamToBuffer(file.fileStream), mimeType: file.metaData.contentType, originalFilename: file.metaData.originalFilename };
	}

	async getFileStream(filePath: string): Promise<{ file: Readable | null, mimeType: string | null, originalFilename?: string; } | null> {
		const file = await this.getFile(filePath);
		if (!file)
			return null;
		return { file: file.fileStream, mimeType: file.metaData.contentType, originalFilename: file.metaData.originalFilename };
	}
}