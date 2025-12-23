import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { FileResponse } from '@/common/interfaces/file-response.interface';
import {
	Controller,
	Get,
	Header,
	Param,
	Post,
	Res,
	StreamableFile,
	UploadedFile,
	UseGuards,
	UseInterceptors
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiExcludeController, ApiExcludeEndpoint, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { S3Service } from './s3.service';

@Controller('storage')
@ApiExcludeController()
export class StorageController {
	constructor(private readonly s3Service: S3Service) { }

	@ApiExcludeEndpoint()
	@Get('signed-url/:key')
	async getSignedUrl(@Param('key') key: string) {
		const signedUrl = await this.s3Service.getSignedUrl(key, 3600);
		return { signedUrl };
	}

	@ApiExcludeEndpoint()
	@Get('file/:key(*)')
	@Header('Cache-Control', 'max-age=3600')
	async streamFile(@Param('key') key: string, @Res() res: Response): Promise<StreamableFile> {
		if (key.includes("papers") && !key.includes("PREVIEW.")) {
			// For security reasons, do not allow direct access to paper files
			res.status(403).send('Access to this file is forbidden');
			return;
		}

		const result: FileResponse | null = await this.s3Service.getFile(key);

		if (!result) {
			res.status(404).send();
			return;
		}

		res.setHeader('Content-Type', result.metaData.contentType);
		if (result.metaData.contentDisposition) {
			res.setHeader('Content-Disposition', result.metaData.contentDisposition);
		}

		result.fileStream.pipe(res);
	}

	@Post("upload")
	@UseInterceptors(FileInterceptor('file'))
	@ApiConsumes('multipart/form-data')
	@ApiOperation({ summary: 'Upload a new paper' })
	@ApiResponse({ status: 201, description: 'Paper created successfully' })
	async uploadFile(@UploadedFile() file?: Express.Multer.File,
	) {
		return await this.s3Service.uploadFile(file);
	}
}