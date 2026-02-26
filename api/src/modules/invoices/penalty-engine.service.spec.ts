import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { PenaltyEngineService } from './penalty-engine.service';
import { InvoicesRepository } from './invoices.repository';
import { Invoice, InvoiceStatus } from './entities/invoice.entity';
import { Tenant } from '@/modules/tenants/entities/tenant.entity';
import { Notification } from '@/modules/notifications/entities/notification.entity';
import { AuditService } from '@/modules/audit/audit.service';
import { SmsService } from '@/modules/sms/sms.service';
import { MailService } from '@/modules/mail/mail.service';
import { Role } from '@/modules/permissions/entities/role.entity';
import { User } from '@/modules/users/entities/user.entity';

/**
 * Create a mock invoice with sensible defaults.
 */
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
		...overrides,
	} as Invoice;
}

describe('PenaltyEngineService', () => {
	let service: PenaltyEngineService;
	let invoicesRepository: jest.Mocked<Partial<InvoicesRepository>>;
	let notificationRepository: jest.Mocked<Partial<Repository<Notification>>>;
	let tenantRepository: jest.Mocked<Partial<Repository<Tenant>>>;
	let auditService: jest.Mocked<Partial<AuditService>>;
	let smsService: jest.Mocked<Partial<SmsService>>;
	let mailService: jest.Mocked<Partial<MailService>>;

	// Mock queryRunner for transaction support
	let mockQueryRunner: any;
	let mockDataSource: any;

	beforeEach(async () => {
		mockQueryRunner = {
			connect: jest.fn(),
			startTransaction: jest.fn(),
			commitTransaction: jest.fn(),
			rollbackTransaction: jest.fn(),
			release: jest.fn(),
			manager: {
				findOne: jest.fn(),
				update: jest.fn(),
			},
		};

		mockDataSource = {
			createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
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
		};

		tenantRepository = {
			findOne: jest.fn().mockResolvedValue({
				tenantId: 'tenant-1',
				user: {
					userId: 'user-1',
					firstName: 'John',
					lastName: 'Doe',
					email: 'john@example.com',
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
				PenaltyEngineService,
				{ provide: DataSource, useValue: mockDataSource },
				{ provide: InvoicesRepository, useValue: invoicesRepository },
				{ provide: AuditService, useValue: auditService },
				{ provide: SmsService, useValue: smsService },
				{ provide: MailService, useValue: mailService },
				{ provide: getRepositoryToken(Notification), useValue: notificationRepository },
				{ provide: getRepositoryToken(Tenant), useValue: tenantRepository },
			],
		}).compile();

		service = module.get<PenaltyEngineService>(PenaltyEngineService);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});

	describe('applyPenalties', () => {
		it('should return zero counts when no overdue invoices', async () => {
			invoicesRepository.findAll.mockResolvedValue([]);

			const result = await service.applyPenalties();

			expect(result).toEqual({ penalized: 0, totalPenalty: 0 });
		});

		it('should apply penalty based on rentAmount (not balanceDue)', async () => {
			const invoice = makeInvoice({
				rentAmount: 40000,
				balanceDue: 50000, // higher than rent due to previous penalties
			});

			invoicesRepository.findAll.mockResolvedValue([invoice]);

			// Locked invoice returned by the transaction
			mockQueryRunner.manager.findOne.mockResolvedValue({ ...invoice });

			const result = await service.applyPenalties();

			// Penalty should be 5% of rentAmount (40000), not balanceDue (50000)
			const expectedPenalty = 40000 * 0.05; // 2000

			expect(mockQueryRunner.manager.update).toHaveBeenCalledWith(
				Invoice,
				invoice.invoiceId,
				expect.objectContaining({
					penaltyAmount: expectedPenalty,
					balanceDue: 50000 + expectedPenalty,
					status: InvoiceStatus.OVERDUE,
				}),
			);
			expect(result.penalized).toBe(1);
			expect(result.totalPenalty).toBe(expectedPenalty);
		});

		it('should skip invoices that are already paid', async () => {
			const invoice = makeInvoice();
			invoicesRepository.findAll.mockResolvedValue([invoice]);

			mockQueryRunner.manager.findOne.mockResolvedValue({
				...invoice,
				status: InvoiceStatus.PAID,
				balanceDue: 0,
			});

			const result = await service.applyPenalties();

			expect(result.penalized).toBe(0);
			expect(mockQueryRunner.manager.update).not.toHaveBeenCalled();
			expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
		});

		it('should skip invoices that are cancelled', async () => {
			const invoice = makeInvoice();
			invoicesRepository.findAll.mockResolvedValue([invoice]);

			mockQueryRunner.manager.findOne.mockResolvedValue({
				...invoice,
				status: InvoiceStatus.CANCELLED,
				balanceDue: 0,
			});

			const result = await service.applyPenalties();

			expect(result.penalized).toBe(0);
			expect(mockQueryRunner.manager.update).not.toHaveBeenCalled();
		});

		it('should not double-apply penalty on the same Nairobi day (idempotency)', async () => {
			const now = new Date('2026-02-07T10:00:00Z'); // 1 PM EAT
			jest.useFakeTimers().setSystemTime(now);

			// penaltyAppliedAt is earlier today in EAT (same calendar day)
			const penaltyAppliedAt = new Date('2026-02-07T01:00:00Z'); // 4 AM EAT, same day

			const invoice = makeInvoice({ penaltyAppliedAt });
			invoicesRepository.findAll.mockResolvedValue([invoice]);

			mockQueryRunner.manager.findOne.mockResolvedValue({ ...invoice });

			const result = await service.applyPenalties();

			expect(result.penalized).toBe(0);
			expect(mockQueryRunner.manager.update).not.toHaveBeenCalled();
			expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();

			jest.useRealTimers();
		});

		it('should apply penalty if penaltyAppliedAt was yesterday (different Nairobi day)', async () => {
			const now = new Date('2026-02-08T01:00:00Z'); // Feb 8 4 AM EAT
			jest.useFakeTimers().setSystemTime(now);

			// penaltyAppliedAt is yesterday in EAT
			const penaltyAppliedAt = new Date('2026-02-07T10:00:00Z'); // Feb 7 1 PM EAT

			const invoice = makeInvoice({
				penaltyAppliedAt,
				rentAmount: 35000,
				balanceDue: 36750, // already has one penalty
				penaltyAmount: 1750,
			});

			invoicesRepository.findAll.mockResolvedValue([invoice]);
			mockQueryRunner.manager.findOne.mockResolvedValue({ ...invoice });

			const result = await service.applyPenalties();

			expect(result.penalized).toBe(1);
			expect(result.totalPenalty).toBe(1750); // 35000 * 0.05
			expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();

			jest.useRealTimers();
		});

		it('should send SMS and email notifications after penalty', async () => {
			const invoice = makeInvoice();
			invoicesRepository.findAll.mockResolvedValue([invoice]);
			mockQueryRunner.manager.findOne.mockResolvedValue({ ...invoice });

			await service.applyPenalties();

			// Wait for fire-and-forget notification promise
			await new Promise((r) => setTimeout(r, 50));

			expect(smsService.sendSms).toHaveBeenCalledWith(
				'0712345678',
				expect.stringContaining('penalty'),
			);
			expect(mailService.sendEmail).toHaveBeenCalledWith(
				expect.objectContaining({
					to: 'john@example.com',
					subject: expect.stringContaining('Penalty Applied'),
				}),
			);
		});

		it('should create notification records for both SMS and email', async () => {
			const invoice = makeInvoice();
			invoicesRepository.findAll.mockResolvedValue([invoice]);
			mockQueryRunner.manager.findOne.mockResolvedValue({ ...invoice });

			await service.applyPenalties();
			await new Promise((r) => setTimeout(r, 50));

			// Should save 2 notifications: one SMS, one email
			expect(notificationRepository.save).toHaveBeenCalledTimes(2);
		});

		it('should still apply penalty even if notification fails', async () => {
			const invoice = makeInvoice();
			invoicesRepository.findAll.mockResolvedValue([invoice]);
			mockQueryRunner.manager.findOne.mockResolvedValue({ ...invoice });

			smsService.sendSms.mockRejectedValue(new Error('SMS gateway down'));
			mailService.sendEmail.mockRejectedValue(new Error('Email service down'));

			const result = await service.applyPenalties();

			// Penalty should still be applied (notification is fire-and-forget)
			expect(result.penalized).toBe(1);
			expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
		});

		it('should process multiple invoices independently', async () => {
			const invoice1 = makeInvoice({ invoiceId: 'inv-1', invoiceNumber: 'INV-001', rentAmount: 20000 });
			const invoice2 = makeInvoice({ invoiceId: 'inv-2', invoiceNumber: 'INV-002', rentAmount: 30000 });

			invoicesRepository.findAll.mockResolvedValue([invoice1, invoice2]);

			mockQueryRunner.manager.findOne
				.mockResolvedValueOnce({ ...invoice1 })
				.mockResolvedValueOnce({ ...invoice2 });

			const result = await service.applyPenalties();

			expect(result.penalized).toBe(2);
			expect(result.totalPenalty).toBe(20000 * 0.05 + 30000 * 0.05); // 1000 + 1500 = 2500
		});

		it('should continue processing remaining invoices if one fails', async () => {
			const invoice1 = makeInvoice({ invoiceId: 'inv-1', rentAmount: 20000 });
			const invoice2 = makeInvoice({ invoiceId: 'inv-2', rentAmount: 30000 });

			invoicesRepository.findAll.mockResolvedValue([invoice1, invoice2]);

			// First invoice fails, second succeeds
			mockQueryRunner.manager.findOne
				.mockRejectedValueOnce(new Error('DB error'))
				.mockResolvedValueOnce({ ...invoice2 });

			const result = await service.applyPenalties();

			expect(result.penalized).toBe(1);
			expect(result.totalPenalty).toBe(1500); // only invoice2's penalty
		});

		it('should create audit log with correct metadata', async () => {
			const invoice = makeInvoice({ rentAmount: 35000, balanceDue: 35000 });
			invoicesRepository.findAll.mockResolvedValue([invoice]);
			mockQueryRunner.manager.findOne.mockResolvedValue({ ...invoice });

			await service.applyPenalties();

			expect(auditService.createLog).toHaveBeenCalledWith(
				expect.objectContaining({
					performerName: 'Penalty Engine',
					metadata: expect.objectContaining({
						penaltyRate: 0.05,
						penaltyAmount: 1750,
						rentAmount: 35000,
					}),
				}),
			);
		});
	});
});
