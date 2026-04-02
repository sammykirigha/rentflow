import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SubscriptionLimitGuard, SUBSCRIPTION_LIMIT_KEY } from './subscription-limit.guard';

function createMockContext(user: any, handler?: any): ExecutionContext {
	return {
		switchToHttp: () => ({
			getRequest: () => ({ user }),
		}),
		getHandler: () => handler || jest.fn(),
		getClass: () => jest.fn(),
	} as unknown as ExecutionContext;
}

describe('SubscriptionLimitGuard', () => {
	let guard: SubscriptionLimitGuard;
	let reflector: Reflector;
	let mockSubscriptionRepo: any;

	beforeEach(() => {
		reflector = new Reflector();
		mockSubscriptionRepo = {
			findOne: jest.fn(),
		};

		guard = new SubscriptionLimitGuard(reflector, mockSubscriptionRepo);
	});

	it('should allow when no subscription limit metadata', async () => {
		jest.spyOn(reflector, 'get').mockReturnValue(undefined);
		const context = createMockContext({ organizationId: 'org-1' });

		const result = await guard.canActivate(context);
		expect(result).toBe(true);
	});

	it('should allow super admin regardless of limits', async () => {
		jest.spyOn(reflector, 'get').mockReturnValue('sms');
		const context = createMockContext({
			isSuperAdmin: true,
			organizationId: 'org-1',
		});

		const result = await guard.canActivate(context);
		expect(result).toBe(true);
		expect(mockSubscriptionRepo.findOne).not.toHaveBeenCalled();
	});

	it('should allow when no user', async () => {
		jest.spyOn(reflector, 'get').mockReturnValue('sms');
		const context = createMockContext(null);

		const result = await guard.canActivate(context);
		expect(result).toBe(true);
	});

	it('should allow when user has no organizationId', async () => {
		jest.spyOn(reflector, 'get').mockReturnValue('sms');
		const context = createMockContext({
			isSuperAdmin: false,
			organizationId: null,
		});

		const result = await guard.canActivate(context);
		expect(result).toBe(true);
	});

	it('should throw when no subscription found', async () => {
		jest.spyOn(reflector, 'get').mockReturnValue('sms');
		mockSubscriptionRepo.findOne.mockResolvedValue(null);

		const context = createMockContext({
			isSuperAdmin: false,
			organizationId: 'org-1',
		});

		await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
		await expect(guard.canActivate(context)).rejects.toThrow('No active subscription found');
	});

	describe('SMS quota', () => {
		it('should allow when SMS usage is below quota', async () => {
			jest.spyOn(reflector, 'get').mockReturnValue('sms');
			mockSubscriptionRepo.findOne.mockResolvedValue({
				smsQuotaMonthly: 100,
				smsUsedThisPeriod: 50,
			});

			const context = createMockContext({
				isSuperAdmin: false,
				organizationId: 'org-1',
			});

			const result = await guard.canActivate(context);
			expect(result).toBe(true);
		});

		it('should throw when SMS quota is exceeded', async () => {
			jest.spyOn(reflector, 'get').mockReturnValue('sms');
			mockSubscriptionRepo.findOne.mockResolvedValue({
				smsQuotaMonthly: 100,
				smsUsedThisPeriod: 100,
			});

			const context = createMockContext({
				isSuperAdmin: false,
				organizationId: 'org-1',
			});

			await expect(guard.canActivate(context)).rejects.toThrow(
				'SMS quota exceeded for current billing period',
			);
		});

		it('should allow unlimited SMS when quota is -1', async () => {
			jest.spyOn(reflector, 'get').mockReturnValue('sms');
			mockSubscriptionRepo.findOne.mockResolvedValue({
				smsQuotaMonthly: -1,
				smsUsedThisPeriod: 999999,
			});

			const context = createMockContext({
				isSuperAdmin: false,
				organizationId: 'org-1',
			});

			const result = await guard.canActivate(context);
			expect(result).toBe(true);
		});

		it('should allow when SMS usage is exactly at quota minus one', async () => {
			jest.spyOn(reflector, 'get').mockReturnValue('sms');
			mockSubscriptionRepo.findOne.mockResolvedValue({
				smsQuotaMonthly: 100,
				smsUsedThisPeriod: 99,
			});

			const context = createMockContext({
				isSuperAdmin: false,
				organizationId: 'org-1',
			});

			const result = await guard.canActivate(context);
			expect(result).toBe(true);
		});
	});

	describe('non-SMS resources', () => {
		it('should allow for properties resource (checked at service level)', async () => {
			jest.spyOn(reflector, 'get').mockReturnValue('properties');
			mockSubscriptionRepo.findOne.mockResolvedValue({
				maxProperties: 3,
				smsQuotaMonthly: 100,
				smsUsedThisPeriod: 0,
			});

			const context = createMockContext({
				isSuperAdmin: false,
				organizationId: 'org-1',
			});

			const result = await guard.canActivate(context);
			expect(result).toBe(true);
		});
	});
});
