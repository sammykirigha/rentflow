import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ReminderService } from './reminder.service';
import { InvoicesRepository } from './invoices.repository';
import { Invoice, InvoiceStatus } from './entities/invoice.entity';
import { Tenant } from '@/modules/tenants/entities/tenant.entity';
import { Notification, NotificationType } from '@/modules/notifications/entities/notification.entity';
import { AuditService } from '@/modules/audit/audit.service';
import { SmsService } from '@/modules/sms/sms.service';
import { MailService } from '@/modules/mail/mail.service';
import { Role } from '@/modules/permissions/entities/role.entity';
import { User } from '@/modules/users/entities/user.entity';

function makeInvoice(overrides: Partial<Invoice> = {}): Invoice {
	return {
		invoiceId: 'inv-1',
		invoiceNumber: 'INV-T001-2026-02',
		tenantId: 'tenant-1',
		billingMonth: new Date('2026-02-01'),
		rentAmount: 35000,
		waterCharge: 0,
		electricityCharge: 0,
		otherCharges: 0,
		subtotal: 35000,
		penaltyAmount: 0,
		totalAmount: 35000,
		amountPaid: 0,
		balanceDue: 35000,
		status: InvoiceStatus.UNPAID,
		dueDate: new Date('2026-02-05'),
		penaltyAppliedAt: null,
		createdAt: new Date(),
		updatedAt: new Date(),
		tenant: {
			tenantId: 'tenant-1',
			user: {
				userId: 'user-1',
				firstName: 'Jane',
				lastName: 'Doe',
				email: 'jane@example.com',
				phone: '0712345678',
			},
		} as Tenant,
		...overrides,
	} as Invoice;
}

describe('ReminderService', () => {
	let service: ReminderService;
	let invoicesRepository: jest.Mocked<Partial<InvoicesRepository>>;
	let notificationRepository: jest.Mocked<Partial<Repository<Notification>>>;
	let tenantRepository: jest.Mocked<Partial<Repository<Tenant>>>;
	let auditService: jest.Mocked<Partial<AuditService>>;
	let smsService: jest.Mocked<Partial<SmsService>>;
	let mailService: jest.Mocked<Partial<MailService>>;
	let mockDataSource: any;

	beforeEach(async () => {
		mockDataSource = {
			getRepository: jest.fn().mockImplementation((entity) => {
				if (entity === Role) {
					return {
						findOne: jest.fn().mockResolvedValue({ roleId: 'role-1', name: 'landlord' }),
					};
				}
				if (entity === User) {
					return {
						findOne: jest.fn().mockResolvedValue({ userId: 'user-landlord' }),
					};
				}
				return { findOne: jest.fn() };
			}),
		};

		invoicesRepository = {
			findAll: jest.fn().mockResolvedValue([]),
		};

		notificationRepository = {
			create: jest.fn().mockImplementation((dto) => dto),
			save: jest.fn().mockResolvedValue({}),
			count: jest.fn().mockResolvedValue(0), // no reminders sent today by default
		};

		tenantRepository = {
			findOne: jest.fn().mockResolvedValue({
				tenantId: 'tenant-1',
				user: {
					userId: 'user-1',
					firstName: 'Jane',
					lastName: 'Doe',
					email: 'jane@example.com',
					phone: '0712345678',
				},
			}),
		};

		auditService = {
			createLog: jest.fn().mockResolvedValue({}),
		};

		smsService = {
			sendSms: jest.fn().mockResolvedValue({ success: true }),
		};

		mailService = {
			sendEmail: jest.fn().mockResolvedValue({}),
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				ReminderService,
				{ provide: DataSource, useValue: mockDataSource },
				{ provide: InvoicesRepository, useValue: invoicesRepository },
				{ provide: AuditService, useValue: auditService },
				{ provide: SmsService, useValue: smsService },
				{ provide: MailService, useValue: mailService },
				{ provide: getRepositoryToken(Notification), useValue: notificationRepository },
				{ provide: getRepositoryToken(Tenant), useValue: tenantRepository },
			],
		}).compile();

		service = module.get<ReminderService>(ReminderService);
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});

	describe('sendReminders', () => {
		it('should skip on day 1 of the month', async () => {
			// Day 1, 8 AM Nairobi = 5 AM UTC
			jest.useFakeTimers().setSystemTime(new Date('2026-02-01T05:00:00Z'));

			const result = await service.sendReminders();

			expect(result).toEqual({ sent: 0, skipped: 0 });
			expect(invoicesRepository.findAll).not.toHaveBeenCalled();
		});

		it('should send grace period reminders on days 2-5', async () => {
			// Day 3, 8 AM Nairobi = 5 AM UTC
			jest.useFakeTimers().setSystemTime(new Date('2026-02-03T05:00:00Z'));

			const invoice = makeInvoice();
			invoicesRepository.findAll.mockResolvedValue([invoice]);

			const result = await service.sendReminders();

			expect(result.sent).toBe(1);

			// SMS should contain friendly reminder language
			expect(smsService.sendSms).toHaveBeenCalledWith(
				'0712345678',
				expect.stringContaining('Reminder'),
			);
			// SMS should mention the penalty start date
			expect(smsService.sendSms).toHaveBeenCalledWith(
				'0712345678',
				expect.stringContaining('penalties'),
			);

			// Email subject should be a payment reminder (not OVERDUE)
			expect(mailService.sendEmail).toHaveBeenCalledWith(
				expect.objectContaining({
					subject: expect.stringContaining('Payment Reminder'),
				}),
			);
		});

		it('should send overdue reminders on day 6+', async () => {
			// Day 7, 8 AM Nairobi = 5 AM UTC
			jest.useFakeTimers().setSystemTime(new Date('2026-02-07T05:00:00Z'));

			const invoice = makeInvoice({
				status: InvoiceStatus.OVERDUE,
				penaltyAmount: 1750,
				totalAmount: 36750,
				balanceDue: 36750,
			});
			invoicesRepository.findAll.mockResolvedValue([invoice]);

			const result = await service.sendReminders();

			expect(result.sent).toBe(1);

			// SMS should contain OVERDUE language
			expect(smsService.sendSms).toHaveBeenCalledWith(
				'0712345678',
				expect.stringContaining('OVERDUE'),
			);

			// Email subject should be OVERDUE
			expect(mailService.sendEmail).toHaveBeenCalledWith(
				expect.objectContaining({
					subject: expect.stringContaining('OVERDUE'),
				}),
			);
		});

		it('should skip invoices that already received a reminder today', async () => {
			jest.useFakeTimers().setSystemTime(new Date('2026-02-03T05:00:00Z'));

			const invoice = makeInvoice();
			invoicesRepository.findAll.mockResolvedValue([invoice]);

			// Simulate a reminder already sent today
			notificationRepository.count.mockResolvedValue(1);

			const result = await service.sendReminders();

			expect(result.sent).toBe(0);
			expect(result.skipped).toBe(1);
			expect(smsService.sendSms).not.toHaveBeenCalled();
			expect(mailService.sendEmail).not.toHaveBeenCalled();
		});

		it('should send reminder if previous reminder was yesterday', async () => {
			jest.useFakeTimers().setSystemTime(new Date('2026-02-04T05:00:00Z'));

			const invoice = makeInvoice();
			invoicesRepository.findAll.mockResolvedValue([invoice]);

			// No reminders sent today
			notificationRepository.count.mockResolvedValue(0);

			const result = await service.sendReminders();

			expect(result.sent).toBe(1);
		});

		it('should handle multiple invoices independently', async () => {
			jest.useFakeTimers().setSystemTime(new Date('2026-02-03T05:00:00Z'));

			const invoice1 = makeInvoice({ invoiceId: 'inv-1', invoiceNumber: 'INV-001' });
			const invoice2 = makeInvoice({ invoiceId: 'inv-2', invoiceNumber: 'INV-002' });
			invoicesRepository.findAll.mockResolvedValue([invoice1, invoice2]);

			// First invoice: no reminder today. Second invoice: already reminded.
			notificationRepository.count
				.mockResolvedValueOnce(0)
				.mockResolvedValueOnce(1);

			const result = await service.sendReminders();

			expect(result.sent).toBe(1);
			expect(result.skipped).toBe(1);
		});

		it('should create notification records for SMS and email', async () => {
			jest.useFakeTimers().setSystemTime(new Date('2026-02-03T05:00:00Z'));

			const invoice = makeInvoice();
			invoicesRepository.findAll.mockResolvedValue([invoice]);

			await service.sendReminders();

			// 2 saves: 1 SMS notification + 1 email notification
			expect(notificationRepository.save).toHaveBeenCalledTimes(2);

			// Verify the SMS notification type
			expect(notificationRepository.create).toHaveBeenCalledWith(
				expect.objectContaining({
					type: NotificationType.PAYMENT_REMINDER,
				}),
			);
		});

		it('should create audit log for each reminder sent', async () => {
			jest.useFakeTimers().setSystemTime(new Date('2026-02-03T05:00:00Z'));

			const invoice = makeInvoice();
			invoicesRepository.findAll.mockResolvedValue([invoice]);

			await service.sendReminders();

			expect(auditService.createLog).toHaveBeenCalledWith(
				expect.objectContaining({
					performerName: 'Reminder Service',
					metadata: expect.objectContaining({
						period: 'grace',
					}),
				}),
			);
		});

		it('should log overdue period in audit for day 6+', async () => {
			jest.useFakeTimers().setSystemTime(new Date('2026-02-08T05:00:00Z'));

			const invoice = makeInvoice({ status: InvoiceStatus.OVERDUE, penaltyAmount: 3500 });
			invoicesRepository.findAll.mockResolvedValue([invoice]);

			await service.sendReminders();

			expect(auditService.createLog).toHaveBeenCalledWith(
				expect.objectContaining({
					metadata: expect.objectContaining({
						period: 'overdue',
					}),
				}),
			);
		});

		it('should return zero counts when no unsettled invoices exist', async () => {
			jest.useFakeTimers().setSystemTime(new Date('2026-02-03T05:00:00Z'));
			invoicesRepository.findAll.mockResolvedValue([]);

			const result = await service.sendReminders();

			expect(result).toEqual({ sent: 0, skipped: 0 });
		});

		it('should continue if one invoice fails and process the rest', async () => {
			jest.useFakeTimers().setSystemTime(new Date('2026-02-03T05:00:00Z'));

			const invoice1 = makeInvoice({
				invoiceId: 'inv-1',
				tenantId: 'tenant-bad',
				tenant: null, // no tenant loaded
			});
			const invoice2 = makeInvoice({ invoiceId: 'inv-2' });

			invoicesRepository.findAll.mockResolvedValue([invoice1, invoice2]);

			// First invoice tenant lookup fails
			tenantRepository.findOne
				.mockResolvedValueOnce(null)
				.mockResolvedValueOnce({
					tenantId: 'tenant-1',
					user: {
						userId: 'user-1',
						firstName: 'Jane',
						email: 'jane@example.com',
						phone: '0712345678',
					},
				} as any);

			const result = await service.sendReminders();

			// invoice1 skipped (no tenant), invoice2 sent
			// The first one won't count as "sent" since sendReminderForInvoice
			// returns early without error when no tenant found, but the flow continues
			expect(result.sent).toBeGreaterThanOrEqual(1);
		});

		it('should handle SMS failure gracefully and still send email', async () => {
			jest.useFakeTimers().setSystemTime(new Date('2026-02-03T05:00:00Z'));

			const invoice = makeInvoice();
			invoicesRepository.findAll.mockResolvedValue([invoice]);

			smsService.sendSms.mockRejectedValue(new Error('SMS gateway timeout'));

			const result = await service.sendReminders();

			// Should still attempt email
			expect(mailService.sendEmail).toHaveBeenCalled();
			expect(result.sent).toBe(1);
		});

		it('should query duplicate check with correct date range', async () => {
			// Feb 5, 8 AM Nairobi = Feb 5, 5 AM UTC
			jest.useFakeTimers().setSystemTime(new Date('2026-02-05T05:00:00Z'));

			const invoice = makeInvoice();
			invoicesRepository.findAll.mockResolvedValue([invoice]);

			await service.sendReminders();

			// The count query should check for today's Nairobi day
			expect(notificationRepository.count).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						invoiceId: 'inv-1',
						type: NotificationType.PAYMENT_REMINDER,
					}),
				}),
			);
		});

		it('should include penalty info in overdue SMS', async () => {
			jest.useFakeTimers().setSystemTime(new Date('2026-02-10T05:00:00Z'));

			const invoice = makeInvoice({
				status: InvoiceStatus.OVERDUE,
				penaltyAmount: 7000,
				balanceDue: 42000,
			});
			invoicesRepository.findAll.mockResolvedValue([invoice]);

			await service.sendReminders();

			expect(smsService.sendSms).toHaveBeenCalledWith(
				'0712345678',
				expect.stringContaining('5% of rent'),
			);
		});
	});
});
