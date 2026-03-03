import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, QueryRunner } from 'typeorm';
import { SettlementCoreService } from './settlement-core.service';
import { Invoice, InvoiceStatus } from './entities/invoice.entity';
import { Tenant, DepositStatus } from '@/modules/tenants/entities/tenant.entity';
import { Receipt } from '@/modules/receipts/entities/receipt.entity';
import { Payment, PaymentMethod, PaymentStatus } from '@/modules/payments/entities/payment.entity';
import { WalletTransaction, WalletTxnType } from '@/modules/wallet/entities/wallet-transaction.entity';
import { AuditAction } from '@/common/enums/audit-action.enum';
import { AuditTargetType } from '@/common/enums/audit-target-type.enum';
import { Role } from '@/modules/permissions/entities/role.entity';
import { User } from '@/modules/users/entities/user.entity';

function makeInvoice(overrides: Partial<Invoice> = {}): Invoice {
	return {
		invoiceId: 'inv-1',
		invoiceNumber: 'INV-A101-2026-02',
		tenantId: 'tenant-1',
		billingMonth: new Date('2026-02-01'),
		rentAmount: 35000,
		waterCharge: 1200,
		electricityCharge: 2500,
		otherCharges: 0,
		subtotal: 38700,
		penaltyAmount: 0,
		totalAmount: 38700,
		amountPaid: 0,
		balanceDue: 38700,
		status: InvoiceStatus.UNPAID,
		dueDate: new Date('2026-02-05'),
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	} as Invoice;
}

function makeTenant(overrides: Partial<Tenant> = {}): Tenant {
	return {
		tenantId: 'tenant-1',
		userId: 'user-1',
		unitId: 'unit-1',
		walletBalance: 50000,
		depositAmount: 0,
		depositStatus: DepositStatus.PENDING,
		status: 'active',
		...overrides,
	} as Tenant;
}

function createMockQueryRunner(): any {
	const savedEntities: any[] = [];
	const updatedEntities: Array<{ entity: any; id: any; data: any }> = [];

	return {
		savedEntities,
		updatedEntities,
		manager: {
			save: jest.fn().mockImplementation((entityOrData) => {
				savedEntities.push(entityOrData);
				return Promise.resolve(entityOrData);
			}),
			create: jest.fn().mockImplementation((_Entity, data) => data),
			update: jest.fn().mockImplementation((entity, id, data) => {
				updatedEntities.push({ entity, id, data });
				return Promise.resolve();
			}),
			findOne: jest.fn().mockResolvedValue(null),
		},
	};
}

describe('SettlementCoreService', () => {
	let service: SettlementCoreService;
	let mockDataSource: any;
	let mockQueryRunner: ReturnType<typeof createMockQueryRunner>;

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

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				SettlementCoreService,
				{ provide: DataSource, useValue: mockDataSource },
			],
		}).compile();

		service = module.get<SettlementCoreService>(SettlementCoreService);
		mockQueryRunner = createMockQueryRunner();
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});

	describe('settleInvoicesFromWallet', () => {
		it('should return empty result when wallet balance is zero', async () => {
			const tenant = makeTenant({ walletBalance: 0 });
			const invoices = [makeInvoice()];

			const result = await service.settleInvoicesFromWallet(
				mockQueryRunner as any,
				tenant,
				invoices,
			);

			expect(result.settled).toBe(0);
			expect(result.partial).toBe(0);
			expect(result.walletBalanceBefore).toBe(0);
			expect(result.walletBalanceAfter).toBe(0);
			expect(result.invoiceResults).toHaveLength(0);
			expect(mockQueryRunner.manager.save).not.toHaveBeenCalled();
		});

		it('should return empty result when wallet balance is negative', async () => {
			const tenant = makeTenant({ walletBalance: -100 });
			const invoices = [makeInvoice()];

			const result = await service.settleInvoicesFromWallet(
				mockQueryRunner as any,
				tenant,
				invoices,
			);

			expect(result.settled).toBe(0);
			expect(result.partial).toBe(0);
			expect(mockQueryRunner.manager.save).not.toHaveBeenCalled();
		});

		it('should return empty result when invoices array is empty', async () => {
			const tenant = makeTenant({ walletBalance: 50000 });

			const result = await service.settleInvoicesFromWallet(
				mockQueryRunner as any,
				tenant,
				[],
			);

			expect(result.settled).toBe(0);
			expect(result.partial).toBe(0);
			expect(result.walletBalanceBefore).toBe(50000);
			expect(result.walletBalanceAfter).toBe(50000);
			expect(mockQueryRunner.manager.save).not.toHaveBeenCalled();
		});

		it('should fully settle a single invoice when wallet >= balanceDue', async () => {
			const tenant = makeTenant({ walletBalance: 50000 });
			const invoice = makeInvoice({ balanceDue: 38700, totalAmount: 38700 });

			const result = await service.settleInvoicesFromWallet(
				mockQueryRunner as any,
				tenant,
				[invoice],
			);

			expect(result.settled).toBe(1);
			expect(result.partial).toBe(0);
			expect(result.walletBalanceBefore).toBe(50000);
			expect(result.walletBalanceAfter).toBe(11300);

			expect(result.invoiceResults).toHaveLength(1);
			expect(result.invoiceResults[0]).toEqual({
				invoiceId: 'inv-1',
				invoiceNumber: 'INV-A101-2026-02',
				type: 'full',
				amountDeducted: 38700,
				remainingBalance: 0,
			});

			// Should create WalletTransaction
			expect(mockQueryRunner.manager.create).toHaveBeenCalledWith(
				WalletTransaction,
				expect.objectContaining({
					tenantId: 'tenant-1',
					type: WalletTxnType.DEBIT_INVOICE,
					amount: 38700,
					balanceBefore: 50000,
					balanceAfter: 11300,
				}),
			);

			// Should create Payment
			expect(mockQueryRunner.manager.create).toHaveBeenCalledWith(
				Payment,
				expect.objectContaining({
					tenantId: 'tenant-1',
					invoiceId: 'inv-1',
					amount: 38700,
					method: PaymentMethod.WALLET_DEDUCTION,
					status: PaymentStatus.COMPLETED,
				}),
			);

			// Should update invoice to PAID
			expect(mockQueryRunner.manager.update).toHaveBeenCalledWith(
				Invoice,
				'inv-1',
				expect.objectContaining({
					amountPaid: 38700,
					balanceDue: 0,
					status: InvoiceStatus.PAID,
					paidAt: expect.any(Date),
				}),
			);
		});

		it('should partially settle when wallet < balanceDue', async () => {
			const tenant = makeTenant({ walletBalance: 15000 });
			const invoice = makeInvoice({ balanceDue: 38700 });

			const result = await service.settleInvoicesFromWallet(
				mockQueryRunner as any,
				tenant,
				[invoice],
			);

			expect(result.settled).toBe(0);
			expect(result.partial).toBe(1);
			expect(result.walletBalanceBefore).toBe(15000);
			expect(result.walletBalanceAfter).toBe(0);

			expect(result.invoiceResults[0]).toEqual({
				invoiceId: 'inv-1',
				invoiceNumber: 'INV-A101-2026-02',
				type: 'partial',
				amountDeducted: 15000,
				remainingBalance: 23700,
			});

			// Should update invoice to PARTIALLY_PAID (no paidAt)
			expect(mockQueryRunner.manager.update).toHaveBeenCalledWith(
				Invoice,
				'inv-1',
				expect.objectContaining({
					amountPaid: 15000,
					balanceDue: 23700,
					status: InvoiceStatus.PARTIALLY_PAID,
				}),
			);

			// Should NOT set paidAt on partial
			const updateCall = mockQueryRunner.updatedEntities.find(
				(u: any) => u.entity === Invoice,
			);
			expect(updateCall.data.paidAt).toBeUndefined();
		});

		it('should settle multiple invoices oldest-first until wallet exhausted', async () => {
			const tenant = makeTenant({ walletBalance: 50000 });
			const invoice1 = makeInvoice({
				invoiceId: 'inv-1',
				invoiceNumber: 'INV-A101-2026-01',
				balanceDue: 20000,
				totalAmount: 20000,
			});
			const invoice2 = makeInvoice({
				invoiceId: 'inv-2',
				invoiceNumber: 'INV-A101-2026-02',
				balanceDue: 20000,
				totalAmount: 20000,
			});
			const invoice3 = makeInvoice({
				invoiceId: 'inv-3',
				invoiceNumber: 'INV-A101-2026-03',
				balanceDue: 20000,
				totalAmount: 20000,
			});

			const result = await service.settleInvoicesFromWallet(
				mockQueryRunner as any,
				tenant,
				[invoice1, invoice2, invoice3],
			);

			expect(result.settled).toBe(2);
			expect(result.partial).toBe(1);
			expect(result.walletBalanceBefore).toBe(50000);
			expect(result.walletBalanceAfter).toBe(0);

			expect(result.invoiceResults).toHaveLength(3);
			expect(result.invoiceResults[0].type).toBe('full');
			expect(result.invoiceResults[0].amountDeducted).toBe(20000);
			expect(result.invoiceResults[1].type).toBe('full');
			expect(result.invoiceResults[1].amountDeducted).toBe(20000);
			expect(result.invoiceResults[2].type).toBe('partial');
			expect(result.invoiceResults[2].amountDeducted).toBe(10000);
			expect(result.invoiceResults[2].remainingBalance).toBe(10000);
		});

		it('should skip invoices with balanceDue <= 0', async () => {
			const tenant = makeTenant({ walletBalance: 50000 });
			const paidInvoice = makeInvoice({
				invoiceId: 'inv-paid',
				invoiceNumber: 'INV-PAID',
				balanceDue: 0,
			});
			const unpaidInvoice = makeInvoice({
				invoiceId: 'inv-unpaid',
				invoiceNumber: 'INV-UNPAID',
				balanceDue: 10000,
				totalAmount: 10000,
			});

			const result = await service.settleInvoicesFromWallet(
				mockQueryRunner as any,
				tenant,
				[paidInvoice, unpaidInvoice],
			);

			expect(result.settled).toBe(1);
			expect(result.partial).toBe(0);
			expect(result.invoiceResults).toHaveLength(2);
			expect(result.invoiceResults[0].type).toBe('skipped');
			expect(result.invoiceResults[1].type).toBe('full');
			expect(result.walletBalanceAfter).toBe(40000);
		});

		it('should stop processing after partial settlement (wallet exhausted)', async () => {
			const tenant = makeTenant({ walletBalance: 5000 });
			const invoice1 = makeInvoice({
				invoiceId: 'inv-1',
				invoiceNumber: 'INV-1',
				balanceDue: 10000,
			});
			const invoice2 = makeInvoice({
				invoiceId: 'inv-2',
				invoiceNumber: 'INV-2',
				balanceDue: 10000,
			});

			const result = await service.settleInvoicesFromWallet(
				mockQueryRunner as any,
				tenant,
				[invoice1, invoice2],
			);

			// Only invoice1 should be processed (partial), invoice2 should not
			expect(result.partial).toBe(1);
			expect(result.settled).toBe(0);
			expect(result.invoiceResults).toHaveLength(1);
			expect(result.invoiceResults[0].invoiceId).toBe('inv-1');
			expect(result.invoiceResults[0].type).toBe('partial');
			expect(result.walletBalanceAfter).toBe(0);
		});

		it('should handle exact wallet balance matching invoice total', async () => {
			const tenant = makeTenant({ walletBalance: 38700 });
			const invoice = makeInvoice({ balanceDue: 38700, totalAmount: 38700 });

			const result = await service.settleInvoicesFromWallet(
				mockQueryRunner as any,
				tenant,
				[invoice],
			);

			expect(result.settled).toBe(1);
			expect(result.partial).toBe(0);
			expect(result.walletBalanceAfter).toBe(0);
			expect(result.invoiceResults[0].type).toBe('full');
		});

		it('should use roundMoney to avoid floating-point errors', async () => {
			// 0.1 + 0.2 = 0.30000000000000004 in JS; roundMoney should fix this
			const tenant = makeTenant({ walletBalance: 100.3 });
			const invoice = makeInvoice({
				invoiceId: 'inv-1',
				balanceDue: 100.1,
				totalAmount: 100.1,
				amountPaid: 0,
			});

			const result = await service.settleInvoicesFromWallet(
				mockQueryRunner as any,
				tenant,
				[invoice],
			);

			expect(result.settled).toBe(1);
			expect(result.walletBalanceAfter).toBe(0.2); // Not 0.19999999999999...
		});

		it('should accumulate amountPaid for partially-paid invoices', async () => {
			const tenant = makeTenant({ walletBalance: 5000 });
			const invoice = makeInvoice({
				invoiceId: 'inv-1',
				balanceDue: 20000,
				amountPaid: 15000, // already partially paid
			});

			const result = await service.settleInvoicesFromWallet(
				mockQueryRunner as any,
				tenant,
				[invoice],
			);

			expect(result.partial).toBe(1);
			expect(result.invoiceResults[0].amountDeducted).toBe(5000);

			// amountPaid should be 15000 + 5000 = 20000
			const invoiceUpdate = mockQueryRunner.updatedEntities.find(
				(u: any) => u.entity === Invoice && u.id === 'inv-1',
			);
			expect(invoiceUpdate.data.amountPaid).toBe(20000);
			expect(invoiceUpdate.data.balanceDue).toBe(15000);
		});

		it('should create receipt for fully settled invoice (new receipt)', async () => {
			const tenant = makeTenant({ walletBalance: 40000 });
			const invoice = makeInvoice({
				balanceDue: 38700,
				totalAmount: 38700,
			});

			// No existing receipt
			mockQueryRunner.manager.findOne.mockResolvedValue(null);

			await service.settleInvoicesFromWallet(
				mockQueryRunner as any,
				tenant,
				[invoice],
			);

			// Should create a receipt with RCP- prefix
			expect(mockQueryRunner.manager.create).toHaveBeenCalledWith(
				Receipt,
				expect.objectContaining({
					receiptNumber: 'RCP-A101-2026-02',
					invoiceId: 'inv-1',
					totalPaid: 38700,
				}),
			);
		});

		it('should update existing receipt instead of creating duplicate (idempotency)', async () => {
			const tenant = makeTenant({ walletBalance: 40000 });
			const invoice = makeInvoice({
				balanceDue: 38700,
				totalAmount: 38700,
			});

			// Existing receipt from a prior partial payment
			mockQueryRunner.manager.findOne.mockResolvedValue({
				receiptId: 'receipt-1',
				invoiceId: 'inv-1',
				totalPaid: 10000,
			});

			await service.settleInvoicesFromWallet(
				mockQueryRunner as any,
				tenant,
				[invoice],
			);

			// Should update existing receipt, not create new
			expect(mockQueryRunner.manager.update).toHaveBeenCalledWith(
				Receipt,
				'receipt-1',
				{ totalPaid: 38700 },
			);
		});

		it('should collect deposit only on full settlement of invoice with Security Deposit', async () => {
			const tenant = makeTenant({
				walletBalance: 50000,
				depositStatus: DepositStatus.PENDING,
			});
			const invoice = makeInvoice({
				balanceDue: 38700,
				totalAmount: 38700,
				otherChargesDesc: 'Security Deposit',
			});

			// findOne for receipt (null) then for tenant (deposit check)
			mockQueryRunner.manager.findOne
				.mockResolvedValueOnce(null) // no existing receipt
				.mockResolvedValueOnce({ ...tenant, depositStatus: DepositStatus.PENDING }); // tenant for deposit

			await service.settleInvoicesFromWallet(
				mockQueryRunner as any,
				tenant,
				[invoice],
			);

			// Should update deposit status to COLLECTED
			expect(mockQueryRunner.manager.update).toHaveBeenCalledWith(
				Tenant,
				'tenant-1',
				{ depositStatus: DepositStatus.COLLECTED },
			);
		});

		it('should NOT collect deposit on partial settlement of Security Deposit invoice', async () => {
			const tenant = makeTenant({
				walletBalance: 10000,
				depositStatus: DepositStatus.PENDING,
			});
			const invoice = makeInvoice({
				balanceDue: 38700,
				otherChargesDesc: 'Security Deposit',
			});

			mockQueryRunner.manager.findOne.mockResolvedValue(null); // no existing receipt

			await service.settleInvoicesFromWallet(
				mockQueryRunner as any,
				tenant,
				[invoice],
			);

			// Should NOT update deposit status
			const tenantUpdates = mockQueryRunner.updatedEntities.filter(
				(u: any) => u.entity === Tenant,
			);
			const depositUpdate = tenantUpdates.find(
				(u: any) => u.data?.depositStatus !== undefined,
			);
			expect(depositUpdate).toBeUndefined();
		});

		it('should NOT collect deposit if already collected', async () => {
			const tenant = makeTenant({
				walletBalance: 50000,
				depositStatus: DepositStatus.COLLECTED,
			});
			const invoice = makeInvoice({
				balanceDue: 38700,
				totalAmount: 38700,
				otherChargesDesc: 'Security Deposit',
			});

			// No existing receipt, tenant already has deposit collected
			mockQueryRunner.manager.findOne
				.mockResolvedValueOnce(null)
				.mockResolvedValueOnce({ ...tenant, depositStatus: DepositStatus.COLLECTED });

			await service.settleInvoicesFromWallet(
				mockQueryRunner as any,
				tenant,
				[invoice],
			);

			// Should NOT update deposit status (already collected)
			const tenantUpdates = mockQueryRunner.updatedEntities.filter(
				(u: any) => u.entity === Tenant && u.data?.depositStatus !== undefined,
			);
			expect(tenantUpdates).toHaveLength(0);
		});

		it('should generate audit log entries for each settled invoice', async () => {
			const tenant = makeTenant({ walletBalance: 50000 });
			const invoice = makeInvoice({
				balanceDue: 38700,
				totalAmount: 38700,
			});

			const result = await service.settleInvoicesFromWallet(
				mockQueryRunner as any,
				tenant,
				[invoice],
				'user-landlord',
			);

			expect(result.pendingAuditLogs).toHaveLength(1);
			expect(result.pendingAuditLogs[0]).toEqual(
				expect.objectContaining({
					action: AuditAction.INVOICE_AUTO_SETTLED,
					performedBy: 'user-landlord',
					targetType: AuditTargetType.INVOICE,
					targetId: 'inv-1',
				}),
			);
			expect(result.pendingAuditLogs[0].metadata).toEqual(
				expect.objectContaining({
					invoiceId: 'inv-1',
					invoiceNumber: 'INV-A101-2026-02',
					tenantId: 'tenant-1',
					amountDeducted: 38700,
				}),
			);
		});

		it('should generate INVOICE_PARTIALLY_SETTLED audit action for partial', async () => {
			const tenant = makeTenant({ walletBalance: 10000 });
			const invoice = makeInvoice({ balanceDue: 38700 });

			const result = await service.settleInvoicesFromWallet(
				mockQueryRunner as any,
				tenant,
				[invoice],
				'user-landlord',
			);

			expect(result.pendingAuditLogs).toHaveLength(1);
			expect(result.pendingAuditLogs[0].action).toBe(AuditAction.INVOICE_PARTIALLY_SETTLED);
		});

		it('should generate multiple audit logs for multiple invoices', async () => {
			const tenant = makeTenant({ walletBalance: 100000 });
			const invoices = [
				makeInvoice({ invoiceId: 'inv-1', invoiceNumber: 'INV-1', balanceDue: 30000, totalAmount: 30000 }),
				makeInvoice({ invoiceId: 'inv-2', invoiceNumber: 'INV-2', balanceDue: 30000, totalAmount: 30000 }),
				makeInvoice({ invoiceId: 'inv-3', invoiceNumber: 'INV-3', balanceDue: 50000 }),
			];

			const result = await service.settleInvoicesFromWallet(
				mockQueryRunner as any,
				tenant,
				invoices,
			);

			expect(result.pendingAuditLogs).toHaveLength(3);
			expect(result.pendingAuditLogs[0].action).toBe(AuditAction.INVOICE_AUTO_SETTLED);
			expect(result.pendingAuditLogs[1].action).toBe(AuditAction.INVOICE_AUTO_SETTLED);
			expect(result.pendingAuditLogs[2].action).toBe(AuditAction.INVOICE_PARTIALLY_SETTLED);
		});

		it('should handle string walletBalance from DB (decimal column)', async () => {
			// TypeORM returns decimal columns as strings
			const tenant = makeTenant({ walletBalance: '50000.00' as any });
			const invoice = makeInvoice({ balanceDue: 38700, totalAmount: 38700 });

			const result = await service.settleInvoicesFromWallet(
				mockQueryRunner as any,
				tenant,
				[invoice],
			);

			expect(result.settled).toBe(1);
			expect(result.walletBalanceBefore).toBe(50000);
			expect(result.walletBalanceAfter).toBe(11300);
		});

		it('should handle string amountPaid and balanceDue from DB', async () => {
			const tenant = makeTenant({ walletBalance: 50000 });
			const invoice = makeInvoice({
				amountPaid: '10000' as any,
				balanceDue: '25000' as any,
				totalAmount: 35000,
			});

			const result = await service.settleInvoicesFromWallet(
				mockQueryRunner as any,
				tenant,
				[invoice],
			);

			expect(result.settled).toBe(1);

			const invoiceUpdate = mockQueryRunner.updatedEntities.find(
				(u: any) => u.entity === Invoice,
			);
			expect(invoiceUpdate.data.amountPaid).toBe(35000); // 10000 + 25000
			expect(invoiceUpdate.data.balanceDue).toBe(0);
		});
	});

	describe('getSystemUserId', () => {
		it('should return landlord userId', async () => {
			const userId = await service.getSystemUserId();
			expect(userId).toBe('user-landlord');
		});

		it('should cache the result after first call', async () => {
			await service.getSystemUserId();
			await service.getSystemUserId();

			// getRepository should only be called for Role once and User once
			expect(mockDataSource.getRepository).toHaveBeenCalledTimes(2);
		});

		it('should return undefined if no landlord role exists', async () => {
			mockDataSource.getRepository.mockImplementation((entity: any) => {
				if (entity === Role) {
					return { findOne: jest.fn().mockResolvedValue(null) };
				}
				return { findOne: jest.fn() };
			});

			// Create a fresh service to clear cache
			const module = await Test.createTestingModule({
				providers: [
					SettlementCoreService,
					{ provide: DataSource, useValue: mockDataSource },
				],
			}).compile();
			const freshService = module.get<SettlementCoreService>(SettlementCoreService);

			const userId = await freshService.getSystemUserId();
			expect(userId).toBeUndefined();
		});
	});
});
