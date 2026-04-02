import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { PlatformService } from './platform.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { MailService } from '../mail/mail.service';
import { AuditService } from '@/modules/audit/audit.service';
import { Organization, OrganizationStatus } from '../organizations/entities/organization.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { User } from '../users/entities/user.entity';
import { Role } from '../permissions/entities/role.entity';
import { PlatformConfig } from './entities/platform-config.entity';
import { AuditAction } from '@/common/enums/audit-action.enum';
import { AuditTargetType } from '@/common/enums/audit-target-type.enum';

describe('PlatformService', () => {
	let service: PlatformService;
	let mockOrgService: any;
	let mockSubService: any;
	let mockAuditService: any;
	let mockJwtService: any;
	let mockConfigService: any;
	let mockMailService: any;
	let mockOrgRepo: any;
	let mockSubRepo: any;
	let mockConfigRepo: any;
	let mockUserRepo: any;
	let mockRoleRepo: any;
	let mockDataSource: any;

	beforeEach(async () => {
		mockOrgService = {
			findOne: jest.fn(),
			suspend: jest.fn(),
			activate: jest.fn(),
		};

		mockSubService = {
			findByOrganization: jest.fn(),
		};

		mockAuditService = {
			createLog: jest.fn().mockResolvedValue({}),
		};

		mockJwtService = {
			sign: jest.fn().mockReturnValue('mock-impersonation-token'),
		};

		mockConfigService = {
			get: jest.fn().mockReturnValue('jwt-secret'),
		};

		mockMailService = {
			sendEmail: jest.fn().mockResolvedValue({}),
		};

		mockOrgRepo = {
			count: jest.fn(),
			findAndCount: jest.fn(),
			createQueryBuilder: jest.fn().mockReturnValue({
				orderBy: jest.fn().mockReturnThis(),
				skip: jest.fn().mockReturnThis(),
				take: jest.fn().mockReturnThis(),
				andWhere: jest.fn().mockReturnThis(),
				getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
			}),
			findOne: jest.fn(),
		};

		mockSubRepo = {};

		mockConfigRepo = {
			find: jest.fn().mockResolvedValue([]),
			findOne: jest.fn(),
			create: jest.fn().mockImplementation((data) => data),
			save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
		};

		mockUserRepo = {
			findOne: jest.fn(),
		};

		mockRoleRepo = {
			findOne: jest.fn(),
		};

		mockDataSource = {
			transaction: jest.fn(),
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				PlatformService,
				{ provide: OrganizationsService, useValue: mockOrgService },
				{ provide: SubscriptionsService, useValue: mockSubService },
				{ provide: AuditService, useValue: mockAuditService },
				{ provide: JwtService, useValue: mockJwtService },
				{ provide: ConfigService, useValue: mockConfigService },
				{ provide: MailService, useValue: mockMailService },
				{ provide: DataSource, useValue: mockDataSource },
				{ provide: getRepositoryToken(Organization), useValue: mockOrgRepo },
				{ provide: getRepositoryToken(Subscription), useValue: mockSubRepo },
				{ provide: getRepositoryToken(PlatformConfig), useValue: mockConfigRepo },
				{ provide: getRepositoryToken(User), useValue: mockUserRepo },
				{ provide: getRepositoryToken(Role), useValue: mockRoleRepo },
			],
		}).compile();

		service = module.get<PlatformService>(PlatformService);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});

	describe('getDashboardStats', () => {
		it('should return org counts by status', async () => {
			mockOrgRepo.count
				.mockResolvedValueOnce(10)  // total
				.mockResolvedValueOnce(6)   // active
				.mockResolvedValueOnce(3)   // trial
				.mockResolvedValueOnce(1);  // suspended

			const result = await service.getDashboardStats();

			expect(result).toEqual({
				totalOrganizations: 10,
				activeOrganizations: 6,
				trialOrganizations: 3,
				suspendedOrganizations: 1,
			});
			expect(mockOrgRepo.count).toHaveBeenCalledTimes(4);
		});

		it('should return zeros when no organizations exist', async () => {
			mockOrgRepo.count.mockResolvedValue(0);

			const result = await service.getDashboardStats();

			expect(result.totalOrganizations).toBe(0);
			expect(result.activeOrganizations).toBe(0);
		});
	});

	describe('getOrganizations', () => {
		it('should return paginated organizations', async () => {
			const orgs = [
				{ organizationId: 'org-1', name: 'Org 1' },
				{ organizationId: 'org-2', name: 'Org 2' },
			];
			const mockQb = {
				orderBy: jest.fn().mockReturnThis(),
				skip: jest.fn().mockReturnThis(),
				take: jest.fn().mockReturnThis(),
				andWhere: jest.fn().mockReturnThis(),
				getManyAndCount: jest.fn().mockResolvedValue([orgs, 25]),
			};
			mockOrgRepo.createQueryBuilder.mockReturnValue(mockQb);

			const result = await service.getOrganizations(2, 10);

			expect(result.data).toEqual(orgs);
			expect(result.pagination).toEqual({
				page: 2,
				limit: 10,
				total: 25,
				totalPages: 3,
			});
			expect(mockQb.skip).toHaveBeenCalledWith(10);
			expect(mockQb.take).toHaveBeenCalledWith(10);
		});

		it('should use default pagination', async () => {
			const result = await service.getOrganizations();

			expect(result.pagination.page).toBe(1);
			expect(result.pagination.limit).toBe(20);
			expect(result.pagination.totalPages).toBe(0);
		});
	});

	describe('getOrganizationDetail', () => {
		it('should return org with subscription', async () => {
			const org = { organizationId: 'org-1', name: 'Test Org' };
			const sub = { subscriptionId: 'sub-1', plan: 'pro' };

			mockOrgService.findOne.mockResolvedValue(org);
			mockSubService.findByOrganization.mockResolvedValue(sub);

			const result = await service.getOrganizationDetail('org-1');

			expect(result).toEqual({ organization: org, subscription: sub });
		});

		it('should return org with null subscription when none exists', async () => {
			mockOrgService.findOne.mockResolvedValue({ organizationId: 'org-1' });
			mockSubService.findByOrganization.mockResolvedValue(null);

			const result = await service.getOrganizationDetail('org-1');

			expect(result.subscription).toBeNull();
		});
	});

	describe('suspendOrganization', () => {
		it('should suspend org and create audit log', async () => {
			const org = { organizationId: 'org-1', name: 'Test Org', status: OrganizationStatus.SUSPENDED };
			mockOrgService.suspend.mockResolvedValue(org);

			const result = await service.suspendOrganization('org-1', 'admin-1');

			expect(result).toEqual(org);
			expect(mockOrgService.suspend).toHaveBeenCalledWith('org-1');
			expect(mockAuditService.createLog).toHaveBeenCalledWith(
				expect.objectContaining({
					action: AuditAction.ORGANIZATION_SUSPENDED,
					performedBy: 'admin-1',
					targetType: AuditTargetType.ORGANIZATION,
					targetId: 'org-1',
				}),
			);
		});
	});

	describe('activateOrganization', () => {
		it('should activate org and create audit log', async () => {
			const org = { organizationId: 'org-1', name: 'Test Org', status: OrganizationStatus.ACTIVE };
			mockOrgService.activate.mockResolvedValue(org);

			const result = await service.activateOrganization('org-1', 'admin-1');

			expect(result).toEqual(org);
			expect(mockAuditService.createLog).toHaveBeenCalledWith(
				expect.objectContaining({
					action: AuditAction.ORGANIZATION_REACTIVATED,
					performedBy: 'admin-1',
					targetType: AuditTargetType.ORGANIZATION,
					targetId: 'org-1',
				}),
			);
		});
	});

	describe('createImpersonationToken', () => {
		it('should create a 1-hour JWT impersonation token', async () => {
			const org = {
				organizationId: 'org-1',
				ownerUserId: 'owner-user-1',
				name: 'Test Org',
			};
			mockOrgService.findOne.mockResolvedValue(org);

			const token = await service.createImpersonationToken('org-1', 'admin-1');

			expect(token).toBe('mock-impersonation-token');
			expect(mockJwtService.sign).toHaveBeenCalledWith(
				expect.objectContaining({
					sub: 'owner-user-1',
					organizationId: 'org-1',
					isSuperAdmin: false,
					impersonatedBy: 'admin-1',
				}),
				expect.objectContaining({
					expiresIn: '1h',
				}),
			);
		});

		it('should create audit log for impersonation', async () => {
			const org = {
				organizationId: 'org-1',
				ownerUserId: 'owner-1',
				name: 'Test Org',
			};
			mockOrgService.findOne.mockResolvedValue(org);

			await service.createImpersonationToken('org-1', 'admin-1');

			expect(mockAuditService.createLog).toHaveBeenCalledWith(
				expect.objectContaining({
					action: AuditAction.IMPERSONATION_STARTED,
					performedBy: 'admin-1',
					targetType: AuditTargetType.ORGANIZATION,
					targetId: 'org-1',
					metadata: { impersonatedOrgId: 'org-1' },
				}),
			);
		});
	});

	describe('config management', () => {
		describe('getConfig', () => {
			it('should return all platform config entries', async () => {
				const configs = [
					{ key: 'platform_name', value: 'RentFlow' },
					{ key: 'maintenance_mode', value: 'false' },
				];
				mockConfigRepo.find.mockResolvedValue(configs);

				const result = await service.getConfig();
				expect(result).toEqual(configs);
			});
		});

		describe('updateConfig', () => {
			it('should update existing config', async () => {
				const existing = { key: 'platform_name', value: 'RentFlow' };
				mockConfigRepo.findOne.mockResolvedValue(existing);

				await service.updateConfig('platform_name', 'NewName', 'Updated name');

				expect(mockConfigRepo.save).toHaveBeenCalledWith(
					expect.objectContaining({
						key: 'platform_name',
						value: 'NewName',
						description: 'Updated name',
					}),
				);
			});

			it('should create new config when key does not exist', async () => {
				mockConfigRepo.findOne.mockResolvedValue(null);

				await service.updateConfig('new_key', 'value', 'description');

				expect(mockConfigRepo.create).toHaveBeenCalledWith({
					key: 'new_key',
					value: 'value',
					description: 'description',
				});
				expect(mockConfigRepo.save).toHaveBeenCalled();
			});
		});
	});
});
