import { IsNotEmpty, IsUrl } from 'class-validator';

export class SubmitWebsiteDto {
	@IsUrl({}, { message: 'Please provide a valid URL' })
	@IsNotEmpty({ message: 'Website URL is required' })
	websiteUrl: string;
}
