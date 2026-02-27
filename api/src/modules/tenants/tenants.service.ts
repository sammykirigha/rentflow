import { AuditAction } from '@/common/enums/audit-action.enum';
import { AuditTargetType } from '@/common/enums/audit-target-type.enum';
import { UserRole } from '@/common/enums/user-role.enum';
import { Unit } from '@/modules/units/entities/unit.entity';
import { Role } from '@/modules/permissions/entities/role.entity';
import {
	Notification,
	NotificationChannel,
	NotificationType,
} from '@/modules/notifications/entities/notification.entity';
import { Invoice } from '@/modules/invoices/entities/invoice.entity';
import { Payment } from '@/modules/payments/entities/payment.entity';
import { WalletTransaction, WalletTxnType } from '@/modules/wallet/entities/wallet-transaction.entity';
import { Receipt } from '@/modules/receipts/entities/receipt.entity';
import { MaintenanceRequest } from '@/modules/maintenance/entities/maintenance-request.entity';
import {
	BadRequestException,
	ConflictException,
	forwardRef,
	Inject,
	Injectable,
	Logger,
	NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { DataSource, Repository } from 'typeorm';
import { User } from '@/modules/users/entities/user.entity';
import authConfig from '@/config/auth.config';
import { generateTenantPassword } from '@/utils/generate-password';
import { AuditService } from '../audit/audit.service';
import { UsersService } from '../users/users.service';
import { UnitsService } from '../units/units.service';
import { SmsService } from '../sms/sms.service';
import { MailService } from '../mail/mail.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { RefundDepositDto } from './dto/refund-deposit.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { Tenant, TenantStatus, DepositStatus } from './entities/tenant.entity';
import { TenantsRepository } from './tenants.repository';

@Injectable()
export class TenantsService {
	private readonly logger = new Logger(TenantsService.name);

	constructor(
		private readonly tenantsRepository: TenantsRepository,
		@Inject(forwardRef(() => UsersService))
		private readonly usersService: UsersService,
		@Inject(forwardRef(() => UnitsService))
		private readonly unitsService: UnitsService,
		private readonly auditService: AuditService,
		private readonly smsService: SmsService,
		private readonly mailService: MailService,
		private readonly dataSource: DataSource,
		@InjectRepository(Unit)
		private readonly unitRepository: Repository<Unit>,
		@InjectRepository(Role)
		private readonly roleRepository: Repository<Role>,
		@InjectRepository(Notification)
		private readonly notificationRepository: Repository<Notification>,
		private readonly configService: ConfigService,
	) {}

	async create(dto: CreateTenantDto, adminUserId: string): Promise<Tenant> {
		// 1. Check unit exists and is not occupied
		const unit = await this.unitRepository.findOne({ where: { unitId: dto.unitId } });

		if (!unit) {
			throw new NotFoundException('Unit not found');
		}

		if (unit.isOccupied) {
			throw new ConflictException('Unit is already occupied');
		}

		// 2. Check no existing tenant record for this unit (covers out-of-sync isOccupied flag)
		const existingTenantForUnit = await this.tenantsRepository.findOne({
			where: { unitId: dto.unitId },
		});

		if (existingTenantForUnit) {
			throw new ConflictException('This unit is already assigned to a tenant');
		}

		// 3. Check email is not already in use
		const existingUserByEmail = await this.usersService['usersRepository'].findOne({
			where: { email: dto.email },
		});

		if (existingUserByEmail) {
			throw new ConflictException('A user with this email already exists');
		}

		// 4. Check phone is not already in use
		if (dto.phone) {
			const existingUserByPhone = await this.usersService['usersRepository'].findOne({
				where: { phone: dto.phone },
			});

			if (existingUserByPhone) {
				throw new ConflictException('A user with this phone number already exists');
			}
		}

		// 5. Split name into firstName + lastName
		const nameParts = dto.name.trim().split(/\s+/);
		const firstName = nameParts[0];
		const lastName = nameParts.slice(1).join(' ') || '';

		// 6. Find the TENANT role
		const tenantRole = await this.roleRepository.findOne({ where: { name: UserRole.TENANT } });

		if (!tenantRole) {
			throw new NotFoundException('Tenant role not found. Please ensure roles are seeded.');
		}

		// 7. Auto-generate password
		const plainPassword = generateTenantPassword();
		const hashedPassword = await bcrypt.hash(plainPassword, authConfig.bcryptRounds);

		// 8. Create User + Tenant + mark unit inside a transaction
		let user: User;
		let tenant: Tenant;

		const queryRunner = this.dataSource.createQueryRunner();
		await queryRunner.connect();
		await queryRunner.startTransaction();

		try {
			user = await queryRunner.manager.save(
				queryRunner.manager.create(User, {
					email: dto.email,
					password: hashedPassword,
					firstName,
					lastName,
					phone: dto.phone,
					roleId: tenantRole.roleId,
				}),
			);

			tenant = await queryRunner.manager.save(
				queryRunner.manager.create(Tenant, {
					userId: user.userId,
					unitId: dto.unitId,
					leaseStart: new Date(dto.leaseStart),
					leaseEnd: dto.leaseEnd ? new Date(dto.leaseEnd) : undefined,
					status: TenantStatus.ACTIVE,
					depositAmount: dto.depositAmount || 0,
					depositStatus: DepositStatus.PENDING,
				}),
			);

			await queryRunner.manager.update(Unit, dto.unitId, { isOccupied: true });

			await queryRunner.commitTransaction();
		} catch (err) {
			await queryRunner.rollbackTransaction();
			this.logger.error(`Failed to create tenant: ${err.message}`);

			// Re-throw friendly messages for known constraint violations
			if (err.code === '23505') {
				if (err.detail?.includes('email')) {
					throw new ConflictException('A user with this email already exists');
				}
				if (err.detail?.includes('phone')) {
					throw new ConflictException('A user with this phone number already exists');
				}
				if (err.detail?.includes('unit_id')) {
					throw new ConflictException('This unit is already assigned to a tenant');
				}
				throw new ConflictException('A record with these details already exists');
			}
			throw err;
		} finally {
			await queryRunner.release();
		}

		// 9. If deposit > 0, generate the first invoice with deposit included
		if (dto.depositAmount && dto.depositAmount > 0) {
			await this.generateDepositInvoice(tenant.tenantId, unit, dto.depositAmount);
		}

		// 10. Log audit
		await this.auditService.createLog({
			action: AuditAction.TENANT_CREATED,
			performedBy: adminUserId,
			targetType: AuditTargetType.TENANT,
			targetId: tenant.tenantId,
			details: `Created tenant "${dto.name}" (${dto.email}) for unit ${unit.unitNumber}`,
			metadata: {
				tenantId: tenant.tenantId,
				userId: user.userId,
				unitId: dto.unitId,
				unitNumber: unit.unitNumber,
				email: dto.email,
				depositAmount: dto.depositAmount || 0,
			},
		});

		// 12. Send welcome credentials (fire-and-forget)
		this.sendWelcomeCredentials({
			tenantId: tenant.tenantId,
			name: dto.name,
			email: dto.email,
			phone: dto.phone,
			password: plainPassword,
			unitNumber: unit.unitNumber,
		}).catch((err) => {
			this.logger.error(`Failed to send welcome credentials to ${dto.email}: ${err.message}`);
		});

		// 13. Return tenant with relations loaded
		return this.tenantsRepository.findOne({
			where: { tenantId: tenant.tenantId },
			relations: { user: true, unit: { property: true } },
		});
	}

	private async sendWelcomeCredentials(params: {
		tenantId: string;
		name: string;
		email: string;
		phone: string;
		password: string;
		unitNumber: string;
	}): Promise<void> {
		const { tenantId, name, email, phone, password, unitNumber } = params;
		const loginUrl = `${this.configService.get('FRONTEND_URL', 'http://localhost:3001')}/login`;

		// SMS
		const smsMessage =
			`Welcome to RentFlow, ${name}! ` +
			`Your unit: ${unitNumber}. ` +
			`Login: ${email} | Password: ${password}. ` +
			`Login here: ${loginUrl} ` +
			`Please change your password after first login.`;

		const smsResult = await this.smsService.sendSms(phone, smsMessage);

		await this.notificationRepository.save(
			this.notificationRepository.create({
				tenantId,
				type: NotificationType.WELCOME_CREDENTIALS,
				channel: NotificationChannel.SMS,
				subject: 'Welcome Credentials',
				message: smsMessage,
				sentAt: smsResult.success ? new Date() : undefined,
				failReason: smsResult.success ? undefined : 'SMS delivery failed',
			}),
		);

		// Email
		const emailHtml = `
			<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
				<h2 style="color: #1890ff;">Welcome to RentFlow</h2>
				<p>Hello <strong>${name}</strong>,</p>
				<p>Your tenant account has been created. Here are your login credentials:</p>
				<div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
					<p style="margin: 4px 0;"><strong>Unit:</strong> ${unitNumber}</p>
					<p style="margin: 4px 0;"><strong>Email:</strong> ${email}</p>
					<p style="margin: 4px 0;"><strong>Password:</strong> ${password}</p>
				</div>
				<div style="text-align: center; margin: 24px 0;">
					<a href="${loginUrl}" style="background: #1890ff; color: #ffffff; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">Login to RentFlow</a>
				</div>
				<p style="color: #ff4d4f;"><strong>Please change your password after your first login.</strong></p>
				<hr style="border: none; border-top: 1px solid #e8e8e8; margin: 24px 0;" />
				<p style="color: #888; font-size: 12px;">This is an automated message from RentFlow.</p>
			</div>
		`;

		const emailResult = await this.mailService.sendEmail({
			to: email,
			subject: 'Welcome to RentFlow — Your Login Credentials',
			html: emailHtml,
		});

		await this.notificationRepository.save(
			this.notificationRepository.create({
				tenantId,
				type: NotificationType.WELCOME_CREDENTIALS,
				channel: NotificationChannel.EMAIL,
				subject: 'Welcome to RentFlow — Your Login Credentials',
				message: emailHtml,
				sentAt: emailResult ? new Date() : undefined,
				failReason: emailResult ? undefined : 'Email delivery failed',
			}),
		);

		this.logger.log(`Welcome credentials sent to ${name} (${email}) via SMS and Email`);
	}

	/**
	 * Generate the first invoice for a tenant with the security deposit included as otherCharges.
	 */
	private async generateDepositInvoice(tenantId: string, unit: Unit, depositAmount: number): Promise<void> {
		const now = new Date();
		const billingMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
		const dueDay = parseInt(process.env.INVOICE_DUE_DAY || '5', 10);
		const dueDate = new Date(Date.UTC(billingMonth.getFullYear(), billingMonth.getMonth(), dueDay));

		const rentAmount = parseFloat(String(unit.rentAmount));
		const otherCharges = depositAmount;
		const subtotal = rentAmount + otherCharges;
		const totalAmount = subtotal;

		const year = billingMonth.getFullYear();
		const month = String(billingMonth.getMonth() + 1).padStart(2, '0');
		const invoiceNumber = `INV-${unit.unitNumber}-${year}-${month}`;

		const queryRunner = this.dataSource.createQueryRunner();
		await queryRunner.connect();
		await queryRunner.startTransaction();

		try {
			// Check if invoice already exists for this tenant/month (avoid duplicates)
			const existing = await queryRunner.manager.findOne(Invoice, {
				where: { tenantId, billingMonth },
			});

			if (existing) {
				this.logger.warn(`Invoice already exists for tenant ${tenantId} for billing month ${billingMonth.toISOString()}, skipping deposit invoice`);
				await queryRunner.rollbackTransaction();
				return;
			}

			await queryRunner.manager.save(
				queryRunner.manager.create(Invoice, {
					invoiceNumber,
					tenantId,
					billingMonth,
					rentAmount,
					waterCharge: 0,
					electricityCharge: 0,
					otherCharges,
					otherChargesDesc: 'Security Deposit',
					subtotal,
					penaltyAmount: 0,
					totalAmount,
					amountPaid: 0,
					balanceDue: totalAmount,
					status: 'unpaid' as any,
					dueDate,
				}),
			);

			await queryRunner.commitTransaction();
			this.logger.log(`Generated deposit invoice ${invoiceNumber} for tenant ${tenantId}, deposit: KES ${depositAmount}`);
		} catch (err) {
			await queryRunner.rollbackTransaction();
			this.logger.error(`Failed to generate deposit invoice for tenant ${tenantId}: ${err.message}`);
		} finally {
			await queryRunner.release();
		}
	}

	async refundDeposit(tenantId: string, dto: RefundDepositDto, userId: string): Promise<Tenant> {
		const tenant = await this.findOne(tenantId);

		if (tenant.depositStatus !== DepositStatus.COLLECTED &&
			tenant.depositStatus !== DepositStatus.PARTIALLY_REFUNDED) {
			throw new BadRequestException('No collected deposit available to refund');
		}

		const depositAmount = parseFloat(String(tenant.depositAmount));
		const deductions = dto.deductions || [];
		const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
		const totalAccountedFor = parseFloat((dto.amount + totalDeductions).toFixed(2));

		if (totalAccountedFor > depositAmount) {
			throw new BadRequestException(
				`Refund (${dto.amount}) + deductions (${totalDeductions}) = ${totalAccountedFor} exceeds remaining deposit of KES ${depositAmount}`,
			);
		}

		const queryRunner = this.dataSource.createQueryRunner();
		await queryRunner.connect();
		await queryRunner.startTransaction();

		try {
			const currentBalance = parseFloat(String(tenant.walletBalance));
			const newBalance = dto.amount > 0
				? parseFloat((currentBalance + dto.amount).toFixed(2))
				: currentBalance;
			const remainingDeposit = parseFloat((depositAmount - totalAccountedFor).toFixed(2));

			await queryRunner.manager.update(Tenant, { tenantId }, {
				walletBalance: newBalance,
				depositAmount: remainingDeposit,
				depositStatus: remainingDeposit <= 0
					? DepositStatus.FULLY_REFUNDED
					: DepositStatus.PARTIALLY_REFUNDED,
			} as any);

			// Only create wallet transaction if there's an actual refund to wallet
			if (dto.amount > 0) {
				const deductionSummary = deductions.length > 0
					? ` (after deductions: ${deductions.map(d => `${d.description} KES ${d.amount}`).join(', ')})`
					: '';

				await queryRunner.manager.save(
					queryRunner.manager.create(WalletTransaction, {
						tenantId,
						type: WalletTxnType.REFUND,
						amount: dto.amount,
						balanceBefore: currentBalance,
						balanceAfter: newBalance,
						reference: 'DEPOSIT-REFUND',
						description: `Security deposit refund of KES ${dto.amount}${deductionSummary}`,
					}),
				);
			}

			await queryRunner.commitTransaction();
		} catch (err) {
			await queryRunner.rollbackTransaction();
			throw err;
		} finally {
			await queryRunner.release();
		}

		await this.auditService.createLog({
			action: AuditAction.DEPOSIT_REFUNDED,
			performedBy: userId,
			targetType: AuditTargetType.TENANT,
			targetId: tenantId,
			details: deductions.length > 0
				? `Refunded KES ${dto.amount} deposit to ${tenant.user?.firstName} ${tenant.user?.lastName} with KES ${totalDeductions} in damage deductions`
				: `Refunded KES ${dto.amount} deposit to ${tenant.user?.firstName} ${tenant.user?.lastName}`,
			metadata: {
				tenantId,
				refundAmount: dto.amount,
				originalDeposit: depositAmount,
				deductions: deductions.length > 0 ? deductions : undefined,
				totalDeductions: deductions.length > 0 ? totalDeductions : undefined,
			},
		});

		return this.findOne(tenantId);
	}

	async findAll({
		page = 1,
		limit = 10,
		status,
		search,
		propertyId,
	}: {
		page: number;
		limit: number;
		status?: TenantStatus;
		search?: string;
		propertyId?: string;
	}): Promise<{
		data: Tenant[];
		pagination: {
			page: number;
			limit: number;
			total: number;
			totalPages: number;
		};
	}> {
		const skip = (page - 1) * limit;

		const queryBuilder = this.tenantsRepository
			.createQueryBuilder('tenant')
			.leftJoinAndSelect('tenant.user', 'user')
			.leftJoinAndSelect('tenant.unit', 'unit')
			.leftJoinAndSelect('unit.property', 'property')
			.orderBy('tenant.createdAt', 'DESC')
			.skip(skip)
			.take(limit);

		if (status) {
			queryBuilder.andWhere('tenant.status = :status', { status });
		}

		if (search) {
			queryBuilder.andWhere(
				'(user.firstName ILIKE :search OR user.lastName ILIKE :search OR user.email ILIKE :search)',
				{ search: `%${search}%` },
			);
		}

		if (propertyId) {
			queryBuilder.andWhere('property.propertyId = :propertyId', { propertyId });
		}

		const [tenants, total] = await queryBuilder.getManyAndCount();

		return {
			data: tenants,
			pagination: {
				page,
				limit,
				total,
				totalPages: Math.ceil(total / limit),
			},
		};
	}

	async findOne(tenantId: string): Promise<Tenant> {
		const tenant = await this.tenantsRepository.findOne({
			where: { tenantId },
			relations: { user: true, unit: { property: true } },
		});

		if (!tenant) {
			throw new NotFoundException('Tenant not found');
		}

		return tenant;
	}

	async update(tenantId: string, dto: UpdateTenantDto, userId: string): Promise<Tenant> {
		const tenant = await this.findOne(tenantId);

		const isReactivating =
			tenant.status === TenantStatus.VACATED &&
			dto.status !== undefined &&
			dto.status !== TenantStatus.VACATED;

		// Reactivating a vacated tenant requires a unit assignment
		if (isReactivating && !dto.unitId) {
			throw new BadRequestException(
				'A unit must be assigned when reactivating a vacated tenant',
			);
		}

		// Prevent setting status to vacated via update — use the vacate endpoint instead
		if (dto.status === TenantStatus.VACATED && tenant.status !== TenantStatus.VACATED) {
			throw new BadRequestException(
				'Use the vacate endpoint to vacate a tenant',
			);
		}

		// unitId should only be provided when reactivating
		if (dto.unitId && !isReactivating) {
			throw new BadRequestException(
				'Unit reassignment is only allowed when reactivating a vacated tenant',
			);
		}

		const updateData: Partial<Tenant> = {};

		if (dto.leaseEnd !== undefined) {
			updateData.leaseEnd = new Date(dto.leaseEnd);
		}

		if (dto.status !== undefined) {
			updateData.status = dto.status;
		}

		const queryRunner = this.dataSource.createQueryRunner();
		await queryRunner.connect();
		await queryRunner.startTransaction();

		try {
			if (isReactivating) {
				// Verify the target unit exists and is not occupied
				const unit = await queryRunner.manager.findOne(Unit, {
					where: { unitId: dto.unitId },
				});

				if (!unit) {
					throw new NotFoundException('Unit not found');
				}

				if (unit.isOccupied) {
					throw new BadRequestException('Unit is already occupied');
				}

				updateData.unitId = dto.unitId;

				await queryRunner.manager.update(Tenant, { tenantId }, updateData as any);
				await queryRunner.manager.update(Unit, dto.unitId, { isOccupied: true });
			} else {
				await queryRunner.manager.update(Tenant, { tenantId }, updateData as any);
			}

			await queryRunner.commitTransaction();
		} catch (err) {
			await queryRunner.rollbackTransaction();
			throw err;
		} finally {
			await queryRunner.release();
		}

		const tenantName = `${tenant.user?.firstName || ''} ${tenant.user?.lastName || ''}`.trim();

		await this.auditService.createLog({
			action: AuditAction.TENANT_UPDATED,
			performedBy: userId,
			targetType: AuditTargetType.TENANT,
			targetId: tenantId,
			details: isReactivating
				? `Reactivated tenant "${tenantName}" and assigned to unit ${dto.unitId}`
				: `Updated tenant "${tenantName}"`,
			metadata: {
				tenantId,
				updatedFields: Object.keys(updateData),
				...(isReactivating ? { unitId: dto.unitId } : {}),
			},
		});

		return this.findOne(tenantId);
	}

	async vacate(tenantId: string, userId: string): Promise<Tenant> {
		const tenant = await this.findOne(tenantId);

		if (tenant.status === TenantStatus.VACATED) {
			throw new BadRequestException('Tenant is already vacated');
		}

		if (!tenant.unitId) {
			throw new BadRequestException(
				'Cannot vacate tenant: no unit is currently assigned. The tenant may have already been disassociated from their unit.',
			);
		}

		const queryRunner = this.dataSource.createQueryRunner();
		await queryRunner.connect();
		await queryRunner.startTransaction();

		const unitId = tenant.unitId;

		try {
			await queryRunner.manager.update(Tenant, { tenantId }, {
				status: TenantStatus.VACATED,
				leaseEnd: new Date(),
				unitId: null,
			} as any);

			await queryRunner.manager.update(Unit, unitId, { isOccupied: false });

			await queryRunner.commitTransaction();
		} catch (err) {
			await queryRunner.rollbackTransaction();
			this.logger.error(`Failed to vacate tenant: ${err.message}`);
			throw new BadRequestException('Failed to vacate tenant. Please try again or contact support.');
		} finally {
			await queryRunner.release();
		}

		await this.auditService.createLog({
			action: AuditAction.TENANT_VACATED,
			performedBy: userId,
			targetType: AuditTargetType.TENANT,
			targetId: tenantId,
			details: `Vacated tenant "${tenant.user?.firstName} ${tenant.user?.lastName}" from unit ${tenant.unit?.unitNumber}`,
			metadata: {
				tenantId,
				unitId: tenant.unitId,
				unitNumber: tenant.unit?.unitNumber,
			},
		});

		return this.findOne(tenantId);
	}

	async delete(tenantId: string, userId: string): Promise<void> {
		// withDeleted: true to find soft-deleted tenants too
		const tenant = await this.dataSource.manager.findOne(Tenant, {
			where: { tenantId },
			relations: { user: true, unit: true },
			withDeleted: true,
		});

		if (!tenant) {
			throw new NotFoundException('Tenant not found');
		}

		if (tenant.status !== TenantStatus.VACATED) {
			throw new BadRequestException('Only vacated tenants can be deleted');
		}

		const tenantName = `${tenant.user?.firstName || ''} ${tenant.user?.lastName || ''}`.trim();
		const unitNumber = tenant.unit?.unitNumber;
		const tenantUserId = tenant.userId;
		const tenantUnitId = tenant.unitId;

		// Get all invoice IDs for this tenant (needed to delete receipts linked to invoices)
		const invoiceIds = (
			await this.dataSource.manager.find(Invoice, {
				where: { tenantId },
				select: ['invoiceId'],
				withDeleted: true,
			})
		).map((i) => i.invoiceId);

		const queryRunner = this.dataSource.createQueryRunner();
		await queryRunner.connect();
		await queryRunner.startTransaction();

		try {
			// Hard delete using raw SQL to bypass soft-delete behavior

			// 1. Delete receipts (FK → invoices)
			if (invoiceIds.length > 0) {
				await queryRunner.query(
					`DELETE FROM receipts WHERE invoice_id = ANY($1)`,
					[invoiceIds],
				);
			}

			// 2. Delete payments (FK → tenants, invoices)
			await queryRunner.query(`DELETE FROM payments WHERE tenant_id = $1`, [tenantId]);

			// 3. Delete wallet transactions (FK → tenants)
			await queryRunner.query(`DELETE FROM wallet_transactions WHERE tenant_id = $1`, [tenantId]);

			// 4. Delete notifications (FK → tenants, invoices)
			await queryRunner.query(`DELETE FROM notifications WHERE tenant_id = $1`, [tenantId]);

			// 5. Delete maintenance requests (FK → tenants)
			await queryRunner.query(`DELETE FROM maintenance_requests WHERE tenant_id = $1`, [tenantId]);

			// 6. Delete invoices (FK → tenants)
			await queryRunner.query(`DELETE FROM invoices WHERE tenant_id = $1`, [tenantId]);

			// 7. Delete tenant record
			await queryRunner.query(`DELETE FROM tenants WHERE tenant_id = $1`, [tenantId]);

			// 8. Delete user record
			await queryRunner.query(`DELETE FROM users WHERE user_id = $1`, [tenantUserId]);

			// 9. Ensure unit is marked as vacant (unitId may be null if already vacated)
			if (tenantUnitId) {
				await queryRunner.manager.update(Unit, tenantUnitId, { isOccupied: false });
			}

			await queryRunner.commitTransaction();
		} catch (err) {
			await queryRunner.rollbackTransaction();
			this.logger.error(`Failed to delete tenant ${tenantId}: ${err.message}`);
			throw err;
		} finally {
			await queryRunner.release();
		}

		await this.auditService.createLog({
			action: AuditAction.TENANT_DELETED,
			performedBy: userId,
			targetType: AuditTargetType.TENANT,
			targetId: tenantId,
			details: `Deleted vacated tenant "${tenantName}" and all associated records (unit: ${unitNumber})`,
			metadata: {
				tenantId,
				userId: tenantUserId,
				unitId: tenantUnitId,
				unitNumber,
				deletedInvoices: invoiceIds.length,
			},
		});
	}
}
