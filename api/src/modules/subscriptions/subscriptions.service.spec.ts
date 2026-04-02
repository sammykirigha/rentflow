import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { Subscription, SubscriptionPlan, SubscriptionStatus } from './entities/subscription.entity';
import { PLAN_LIMITS } from './constants/plan-limits';

describe('SubscriptionsService', () => {
	let service: SubscriptionsService;
	let mockRepo: any;

	beforeEach(async () => {
		mockRepo = {
			create: jest.fn().mockImplementation((data) => data),
			save: jest.fn().mockImplementation((entity) => Promise.resolve({ subscriptionId: 'sub-1', ...entity })),
			findOne: jest.fn(),
			createQueryBuilder: jest.fn().mockReturnValue({
				update: jest.fn().mockReturnThis(),
				set: jest.fn().mockReturnThis(),
				where: jest.fn().mockReturnThis(),
				andWhere: jest.fn().mockReturnThis(),
				execute: jest.fn().mockResolvedValue({ affected: 1 }),
			}),
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				SubscriptionsService,
				{ provide: getRepositoryToken(Subscription), useValue: mockRepo },
			],
		}).compile();

		service = module.get<SubscriptionsService>(SubscriptionsService);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});

	describe('createTrialSubscription', () => {
		it('should create a 14-day trial with Pro limits', async () => {
			const result = await service.createTrialSubscription('org-1');

			expect(mockRepo.create).toHaveBeenCalledWith(
				expect.objectContaining({
					organizationId: 'org-1',
					plan: SubscriptionPlan.PRO,
					status: SubscriptionStatus.TRIAL,
					...PLAN_LIMITS[SubscriptionPlan.PRO],
				}),
			);
			expect(mockRepo.save).toHaveBeenCalled();

			// Verify trial ends ~14 days from now
			const createArg = mockRepo.create.mock.calls[0][0];
			const trialEnd = new Date(createArg.trialEndsAt);
			const now = new Date();
			const diffDays = (trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
			expect(diffDays).toBeGreaterThanOrEqual(13);
			expect(diffDays).toBeLessThanOrEqual(15);
		});

		it('should set current period start and end', async () => {
			await service.createTrialSubscription('org-1');

			const createArg = mockRepo.create.mock.calls[0][0];
			expect(createArg.currentPeriodStart).toBeDefined();
			expect(createArg.currentPeriodEnd).toBeDefined();
		});
	});

	describe('findByOrganization', () => {
		it('should find subscription by organizationId', async () => {
			const sub = { subscriptionId: 'sub-1', organizationId: 'org-1' };
			mockRepo.findOne.mockResolvedValue(sub);

			const result = await service.findByOrganization('org-1');

			expect(result).toEqual(sub);
			expect(mockRepo.findOne).toHaveBeenCalledWith({
				where: { organizationId: 'org-1' },
			});
		});

		it('should return null when no subscription exists', async () => {
			mockRepo.findOne.mockResolvedValue(null);

			const result = await service.findByOrganization('org-nonexistent');
			expect(result).toBeNull();
		});
	});

	describe('updatePlan', () => {
		it('should update plan and apply new limits', async () => {
			const existingSub = {
				subscriptionId: 'sub-1',
				organizationId: 'org-1',
				plan: SubscriptionPlan.BASIC,
				status: SubscriptionStatus.ACTIVE,
			};
			mockRepo.findOne.mockResolvedValue(existingSub);

			await service.updatePlan('org-1', SubscriptionPlan.ENTERPRISE);

			expect(mockRepo.save).toHaveBeenCalledWith(
				expect.objectContaining({
					plan: SubscriptionPlan.ENTERPRISE,
					status: SubscriptionStatus.ACTIVE,
					...PLAN_LIMITS[SubscriptionPlan.ENTERPRISE],
				}),
			);
		});

		it('should throw NotFoundException when subscription not found', async () => {
			mockRepo.findOne.mockResolvedValue(null);

			await expect(
				service.updatePlan('org-nonexistent', SubscriptionPlan.PRO),
			).rejects.toThrow(NotFoundException);
		});

		it('should downgrade from Enterprise to Basic', async () => {
			const sub = {
				subscriptionId: 'sub-1',
				organizationId: 'org-1',
				plan: SubscriptionPlan.ENTERPRISE,
			};
			mockRepo.findOne.mockResolvedValue(sub);

			await service.updatePlan('org-1', SubscriptionPlan.BASIC);

			expect(mockRepo.save).toHaveBeenCalledWith(
				expect.objectContaining({
					plan: SubscriptionPlan.BASIC,
					maxProperties: 3,
					maxUnits: 50,
					hasPdfExport: false,
					hasBulkMessaging: false,
					hasApiAccess: false,
				}),
			);
		});
	});

	describe('cancel', () => {
		it('should set subscription status to CANCELLED', async () => {
			const sub = {
				subscriptionId: 'sub-1',
				organizationId: 'org-1',
				status: SubscriptionStatus.ACTIVE,
			};
			mockRepo.findOne.mockResolvedValue(sub);

			await service.cancel('org-1');

			expect(mockRepo.save).toHaveBeenCalledWith(
				expect.objectContaining({
					status: SubscriptionStatus.CANCELLED,
				}),
			);
		});

		it('should throw NotFoundException when not found', async () => {
			mockRepo.findOne.mockResolvedValue(null);

			await expect(service.cancel('org-nonexistent')).rejects.toThrow(NotFoundException);
		});
	});

	describe('incrementSmsUsage', () => {
		it('should return true when increment succeeds (under quota)', async () => {
			const result = await service.incrementSmsUsage('org-1');
			expect(result).toBe(true);
		});

		it('should return false when quota is exceeded (no rows affected)', async () => {
			mockRepo.createQueryBuilder.mockReturnValue({
				update: jest.fn().mockReturnThis(),
				set: jest.fn().mockReturnThis(),
				where: jest.fn().mockReturnThis(),
				andWhere: jest.fn().mockReturnThis(),
				execute: jest.fn().mockResolvedValue({ affected: 0 }),
			});

			const result = await service.incrementSmsUsage('org-1');
			expect(result).toBe(false);
		});
	});

	describe('resetMonthlySmsUsage', () => {
		it('should reset sms_used_this_period to 0 for active/trial subscriptions', async () => {
			const mockQb = {
				update: jest.fn().mockReturnThis(),
				set: jest.fn().mockReturnThis(),
				where: jest.fn().mockReturnThis(),
				execute: jest.fn().mockResolvedValue({ affected: 5 }),
			};
			mockRepo.createQueryBuilder.mockReturnValue(mockQb);

			await service.resetMonthlySmsUsage();

			expect(mockQb.set).toHaveBeenCalledWith({ smsUsedThisPeriod: 0 });
			expect(mockQb.where).toHaveBeenCalledWith(
				'status IN (:...statuses)',
				{ statuses: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] },
			);
			expect(mockQb.execute).toHaveBeenCalled();
		});
	});
});
