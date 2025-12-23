import { FILE_TYPE_JPEG, FILE_TYPE_JPG, FILE_TYPE_PDF, FILE_TYPE_PNG } from '@/constants';
import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { isArray } from 'class-validator';

@Injectable()
export class FileValidationPipe implements PipeTransform {
	private readonly allowedMimeTypes = [
		FILE_TYPE_PDF,
		FILE_TYPE_JPEG,
		FILE_TYPE_PNG,
		FILE_TYPE_JPG
	];

	private readonly maxSize = 5 * 1024 * 1024; // 5MB

	transform(file: Express.Multer.File) {
		if (!file) {
			throw new BadRequestException('File is required');
		}

		console.log({ file });

		if (isArray(file)) {
			file.forEach(f => this.validateFile(f));
		} else {
			this.validateFile(file);
		}

		return file;
	}

	private validateFile(file: Express.Multer.File) {

		// Check file type
		if (!this.allowedMimeTypes.includes(file.mimetype)) {
			throw new BadRequestException(
				'Invalid file provided. Only PDF, JPEG, JPG, and PNG files are allowed.',
			);
		}

		// Check file size
		if (file.size > this.maxSize) {
			throw new BadRequestException(
				`File size exceeds maximum limit of ${this.maxSize / 1024 / 1024}MB`,
			);
		}

		return file;
	}
}