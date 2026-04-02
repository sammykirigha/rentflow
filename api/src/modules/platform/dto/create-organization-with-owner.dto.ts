import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { SubscriptionPlan } from '@/modules/subscriptions/entities/subscription.entity';

export class CreateOrganizationWithOwnerDto {
	// Organization fields
	@IsNotEmpty()
	@IsString()
	@MaxLength(100)
	name: string;

	@IsNotEmpty()
	@IsString()
	@Matches(/^[a-z0-9-]+$/, { message: 'Slug must be lowercase alphanumeric with hyphens' })
	@MaxLength(50)
	slug: string;

	// Owner fields
	@IsNotEmpty()
	@IsEmail()
	ownerEmail: string;

	@IsNotEmpty()
	@IsString()
	@MaxLength(50)
	ownerFirstName: string;

	@IsNotEmpty()
	@IsString()
	@MaxLength(50)
	ownerLastName: string;

	@IsOptional()
	@IsString()
	ownerPhone?: string;

	@IsOptional()
	@IsEnum(SubscriptionPlan)
	plan?: SubscriptionPlan;
}
