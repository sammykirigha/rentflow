import { EncryptionService } from '@/common/services/encryption.service';
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Organization, OrganizationStatus } from './entities/organization.entity';
import { OrganizationsRepository } from './organizations.repository';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@Injectable()
export class OrganizationsService {
	constructor(
		private readonly organizationsRepository: OrganizationsRepository,
		private readonly encryptionService: EncryptionService,
	) {}

	async create(dto: CreateOrganizationDto, ownerUserId: string): Promise<Organization> {
		const existing = await this.organizationsRepository.findOne({
			where: { slug: dto.slug },
		});
		if (existing) {
			throw new ConflictException('Organization with this slug already exists');
		}

		return this.organizationsRepository.create({
			...dto,
			ownerUserId,
			status: OrganizationStatus.TRIAL,
		});
	}

	async findAll(): Promise<Organization[]> {
		return this.organizationsRepository.findAll({
			order: { createdAt: 'DESC' } as any,
		});
	}

	async findOne(organizationId: string): Promise<Organization> {
		const org = await this.organizationsRepository.findOne({
			where: { organizationId } as any,
		});
		if (!org) {
			throw new NotFoundException('Organization not found');
		}
		return org;
	}

	async findByShortcode(shortcode: string): Promise<Organization | null> {
		return this.organizationsRepository.findOne({
			where: { mpesaShortcode: shortcode } as any,
		});
	}

	/**
	 * Returns all organizations that have M-Pesa credentials configured
	 * (consumer key, consumer secret, and shortcode are all required).
	 */
	async findAllWithMpesaConfigured(): Promise<Organization[]> {
		const qb = this.organizationsRepository.createQueryBuilder('org');
		return qb
			.where('org.mpesa_consumer_key IS NOT NULL')
			.andWhere('org.mpesa_consumer_secret IS NOT NULL')
			.andWhere('org.mpesa_shortcode IS NOT NULL')
			.andWhere('org.status != :cancelled', { cancelled: OrganizationStatus.CANCELLED })
			.getMany();
	}

	async update(organizationId: string, dto: UpdateOrganizationDto): Promise<Organization> {
		const org = await this.findOne(organizationId);

		// Encrypt sensitive M-Pesa credentials before storing
		const updateData: any = { ...dto };

		if (dto.mpesaConsumerKey) {
			updateData.mpesaConsumerKey = await this.encryptionService.encrypt(dto.mpesaConsumerKey);
		}
		if (dto.mpesaConsumerSecret) {
			updateData.mpesaConsumerSecret = await this.encryptionService.encrypt(dto.mpesaConsumerSecret);
		}
		if (dto.mpesaPasskey) {
			updateData.mpesaPasskey = await this.encryptionService.encrypt(dto.mpesaPasskey);
		}

		Object.assign(org, updateData);
		return this.organizationsRepository.save(org);
	}

	async getDecryptedMpesaCredentials(organizationId: string): Promise<{
		consumerKey: string;
		consumerSecret: string;
		passkey: string;
		shortcode: string;
		environment: string;
		callbackBaseUrl: string;
	} | null> {
		const org = await this.findOne(organizationId);

		if (!org.mpesaConsumerKey || !org.mpesaConsumerSecret || !org.mpesaShortcode) {
			return null;
		}

		return {
			consumerKey: await this.encryptionService.decrypt(org.mpesaConsumerKey),
			consumerSecret: await this.encryptionService.decrypt(org.mpesaConsumerSecret),
			passkey: org.mpesaPasskey ? await this.encryptionService.decrypt(org.mpesaPasskey) : '',
			shortcode: org.mpesaShortcode,
			environment: org.mpesaEnvironment || 'sandbox',
			callbackBaseUrl: org.mpesaCallbackBaseUrl || '',
		};
	}

	async getCredentialStatus(organizationId: string) {
		const org = await this.findOne(organizationId);

		const maskValue = async (val?: string): Promise<string | null> => {
			if (!val) return null;
			try {
				const decrypted = await this.encryptionService.decrypt(val);
				if (typeof decrypted === 'string' && decrypted.length > 4) {
					return '****' + decrypted.slice(-4);
				}
				return '****';
			} catch {
				return '****';
			}
		};

		return {
			mpesa: {
				isConfigured: !!(org.mpesaConsumerKey && org.mpesaConsumerSecret && org.mpesaShortcode),
				shortcode: org.mpesaShortcode || null,
				environment: org.mpesaEnvironment || 'sandbox',
				consumerKeyMask: await maskValue(org.mpesaConsumerKey),
			},
		};
	}

	async suspend(organizationId: string): Promise<Organization> {
		return this.update(organizationId, { status: OrganizationStatus.SUSPENDED });
	}

	async activate(organizationId: string): Promise<Organization> {
		return this.update(organizationId, { status: OrganizationStatus.ACTIVE });
	}
}
