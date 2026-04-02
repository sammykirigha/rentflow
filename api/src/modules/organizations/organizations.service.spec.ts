import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { OrganizationsRepository } from './organizations.repository';
import { EncryptionService } from '@/common/services/encryption.service';
import { OrganizationStatus } from './entities/organization.entity';

describe('OrganizationsService', () => {
	let service: OrganizationsService;
	let mockRepo: any;
	let mockEncryption: any;

	beforeEach(async () => {
		mockRepo = {
			findOne: jest.fn(),
			findAll: jest.fn(),
			create: jest.fn(),
			save: jest.fn(),
		};

		mockEncryption = {
			encrypt: jest.fn().mockImplementation((text) => Promise.resolve(`encrypted_${text}`)),
			decrypt: jest.fn().mockImplementation((text) => Promise.resolve(text.replace('encrypted_', ''))),
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				OrganizationsService,
				{ provide: OrganizationsRepository, useValue: mockRepo },
				{ provide: EncryptionService, useValue: mockEncryption },
			],
		}).compile();

		service = module.get<OrganizationsService>(OrganizationsService);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});

	describe('create', () => {
		it('should create a new organization with TRIAL status', async () => {
			mockRepo.findOne.mockResolvedValue(null);
			mockRepo.create.mockResolvedValue({
				organizationId: 'org-1',
				name: 'Test Org',
				slug: 'test-org',
				status: OrganizationStatus.TRIAL,
				ownerUserId: 'user-1',
			});

			const result = await service.create(
				{ name: 'Test Org', slug: 'test-org' },
				'user-1',
			);

			expect(result.organizationId).toBe('org-1');
			expect(mockRepo.create).toHaveBeenCalledWith(
				expect.objectContaining({
					name: 'Test Org',
					slug: 'test-org',
					ownerUserId: 'user-1',
					status: OrganizationStatus.TRIAL,
				}),
			);
		});

		it('should throw ConflictException when slug already exists', async () => {
			mockRepo.findOne.mockResolvedValue({ organizationId: 'existing-org' });

			await expect(
				service.create({ name: 'Test Org', slug: 'existing-slug' }, 'user-1'),
			).rejects.toThrow(ConflictException);
		});
	});

	describe('findAll', () => {
		it('should return all organizations ordered by createdAt DESC', async () => {
			const orgs = [
				{ organizationId: 'org-1', name: 'Org 1' },
				{ organizationId: 'org-2', name: 'Org 2' },
			];
			mockRepo.findAll.mockResolvedValue(orgs);

			const result = await service.findAll();

			expect(result).toEqual(orgs);
			expect(mockRepo.findAll).toHaveBeenCalledWith({
				order: { createdAt: 'DESC' },
			});
		});
	});

	describe('findOne', () => {
		it('should return organization by ID', async () => {
			const org = { organizationId: 'org-1', name: 'Test Org' };
			mockRepo.findOne.mockResolvedValue(org);

			const result = await service.findOne('org-1');
			expect(result).toEqual(org);
		});

		it('should throw NotFoundException when not found', async () => {
			mockRepo.findOne.mockResolvedValue(null);

			await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
		});
	});

	describe('findByShortcode', () => {
		it('should find organization by M-Pesa shortcode', async () => {
			const org = { organizationId: 'org-1', mpesaShortcode: '174379' };
			mockRepo.findOne.mockResolvedValue(org);

			const result = await service.findByShortcode('174379');
			expect(result).toEqual(org);
		});

		it('should return null when shortcode not found', async () => {
			mockRepo.findOne.mockResolvedValue(null);

			const result = await service.findByShortcode('unknown');
			expect(result).toBeNull();
		});
	});

	describe('update', () => {
		const existingOrg = {
			organizationId: 'org-1',
			name: 'Test Org',
			slug: 'test-org',
			status: OrganizationStatus.ACTIVE,
		};

		beforeEach(() => {
			mockRepo.findOne.mockResolvedValue({ ...existingOrg });
			mockRepo.save.mockImplementation((entity: any) => Promise.resolve(entity));
		});

		it('should update basic fields', async () => {
			const result = await service.update('org-1', { name: 'Updated Org' });

			expect(result.name).toBe('Updated Org');
			expect(mockRepo.save).toHaveBeenCalled();
		});

		it('should encrypt M-Pesa credentials before storing', async () => {
			await service.update('org-1', {
				mpesaConsumerKey: 'secret-key',
				mpesaConsumerSecret: 'secret-value',
				mpesaPasskey: 'passkey-123',
			});

			expect(mockEncryption.encrypt).toHaveBeenCalledWith('secret-key');
			expect(mockEncryption.encrypt).toHaveBeenCalledWith('secret-value');
			expect(mockEncryption.encrypt).toHaveBeenCalledWith('passkey-123');
			expect(mockEncryption.encrypt).toHaveBeenCalledTimes(3);
		});

		it('should encrypt AT API key', async () => {
			await service.update('org-1', { atApiKey: 'at-key-123' });

			expect(mockEncryption.encrypt).toHaveBeenCalledWith('at-key-123');
		});

		it('should not encrypt when credentials are not provided', async () => {
			await service.update('org-1', { name: 'Updated' });

			expect(mockEncryption.encrypt).not.toHaveBeenCalled();
		});

		it('should throw NotFoundException for invalid org ID', async () => {
			mockRepo.findOne.mockResolvedValue(null);

			await expect(service.update('bad-id', { name: 'Test' })).rejects.toThrow(
				NotFoundException,
			);
		});
	});

	describe('getDecryptedMpesaCredentials', () => {
		it('should return decrypted credentials', async () => {
			mockRepo.findOne.mockResolvedValue({
				organizationId: 'org-1',
				mpesaConsumerKey: 'encrypted_key',
				mpesaConsumerSecret: 'encrypted_secret',
				mpesaPasskey: 'encrypted_passkey',
				mpesaShortcode: '174379',
				mpesaEnvironment: 'sandbox',
				mpesaCallbackBaseUrl: 'https://example.com',
			});

			const result = await service.getDecryptedMpesaCredentials('org-1');

			expect(result).toEqual({
				consumerKey: 'key',
				consumerSecret: 'secret',
				passkey: 'passkey',
				shortcode: '174379',
				environment: 'sandbox',
				callbackBaseUrl: 'https://example.com',
			});
			expect(mockEncryption.decrypt).toHaveBeenCalledTimes(3);
		});

		it('should return null when credentials not configured', async () => {
			mockRepo.findOne.mockResolvedValue({
				organizationId: 'org-1',
				mpesaConsumerKey: null,
				mpesaConsumerSecret: null,
				mpesaShortcode: null,
			});

			const result = await service.getDecryptedMpesaCredentials('org-1');
			expect(result).toBeNull();
		});

		it('should handle missing passkey', async () => {
			mockRepo.findOne.mockResolvedValue({
				organizationId: 'org-1',
				mpesaConsumerKey: 'encrypted_key',
				mpesaConsumerSecret: 'encrypted_secret',
				mpesaPasskey: null,
				mpesaShortcode: '174379',
				mpesaEnvironment: 'production',
				mpesaCallbackBaseUrl: null,
			});

			const result = await service.getDecryptedMpesaCredentials('org-1');

			expect(result!.passkey).toBe('');
			expect(result!.callbackBaseUrl).toBe('');
			expect(result!.environment).toBe('production');
		});
	});

	describe('suspend', () => {
		it('should update org status to SUSPENDED', async () => {
			const org = {
				organizationId: 'org-1',
				name: 'Test Org',
				status: OrganizationStatus.ACTIVE,
			};
			mockRepo.findOne.mockResolvedValue({ ...org });
			mockRepo.save.mockImplementation((entity: any) => Promise.resolve(entity));

			const result = await service.suspend('org-1');

			expect(mockRepo.save).toHaveBeenCalled();
			const savedArg = mockRepo.save.mock.calls[0][0];
			expect(savedArg.status).toBe(OrganizationStatus.SUSPENDED);
		});
	});

	describe('activate', () => {
		it('should update org status to ACTIVE', async () => {
			const org = {
				organizationId: 'org-1',
				name: 'Test Org',
				status: OrganizationStatus.SUSPENDED,
			};
			mockRepo.findOne.mockResolvedValue({ ...org });
			mockRepo.save.mockImplementation((entity: any) => Promise.resolve(entity));

			const result = await service.activate('org-1');

			const savedArg = mockRepo.save.mock.calls[0][0];
			expect(savedArg.status).toBe(OrganizationStatus.ACTIVE);
		});
	});
});
