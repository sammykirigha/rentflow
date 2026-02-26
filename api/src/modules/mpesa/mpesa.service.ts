import { AuditAction } from '@/common/enums/audit-action.enum';
import { AuditTargetType } from '@/common/enums/audit-target-type.enum';
import { Tenant, TenantStatus } from '@/modules/tenants/entities/tenant.entity';
import { Unit } from '@/modules/units/entities/unit.entity';
import { Payment, PaymentMethod, PaymentStatus } from '@/modules/payments/entities/payment.entity';
import { WalletSettlementService } from '@/modules/invoices/wallet-settlement.service';
import { WalletService } from '@/modules/wallet/wallet.service';
import { AuditService } from '@/modules/audit/audit.service';
import { PaymentsRepository } from '@/modules/payments/payments.repository';
import {
	forwardRef,
	Inject,
	Injectable,
	Logger,
	NotFoundException,
	OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import axios from 'axios';
import { DataSource, ILike, Repository } from 'typeorm';
import {
	C2bBody,
	DarajaOAuthResponse,
	DarajaResultResponse,
	StkCallbackBody,
	StkPushResponse,
} from './interfaces/daraja.interfaces';

@Injectable()
export class MpesaService implements OnModuleInit {
	private readonly logger = new Logger(MpesaService.name);

	private accessToken: string | null = null;
	private tokenExpiry: number = 0;

	private readonly baseUrl: string;
	private readonly consumerKey: string;
	private readonly consumerSecret: string;
	private readonly passkey: string;
	private readonly shortcode: string;
	private readonly callbackBaseUrl: string;
	private readonly environment: string;

	constructor(
		private readonly configService: ConfigService,
		private readonly dataSource: DataSource,
		private readonly paymentsRepository: PaymentsRepository,
		private readonly walletService: WalletService,
		@Inject(forwardRef(() => WalletSettlementService))
		private readonly walletSettlementService: WalletSettlementService,
		private readonly auditService: AuditService,
		@InjectRepository(Tenant)
		private readonly tenantRepository: Repository<Tenant>,
		@InjectRepository(Unit)
		private readonly unitRepository: Repository<Unit>,
	) {
		this.environment = this.configService.get<string>('MPESA_ENVIRONMENT', 'sandbox');
		this.baseUrl =
			this.environment === 'production'
				? 'https://api.safaricom.co.ke'
				: 'https://sandbox.safaricom.co.ke';
		this.consumerKey = this.configService.get<string>('MPESA_CONSUMER_KEY', '');
		this.consumerSecret = this.configService.get<string>('MPESA_CONSUMER_SECRET', '');
		this.passkey = this.configService.get<string>('MPESA_PASSKEY', '');
		this.shortcode = this.configService.get<string>('MPESA_SHORTCODE', '');
		this.callbackBaseUrl = this.configService.get<string>('MPESA_CALLBACK_BASE_URL', '');
	}

	async onModuleInit(): Promise<void> {
		if (!this.consumerKey || !this.consumerSecret || !this.callbackBaseUrl || !this.shortcode) {
			this.logger.warn(
				'M-Pesa credentials or callback URL not fully configured, skipping C2B URL registration',
			);
			return;
		}

		try {
			await this.registerC2bUrls();
			this.logger.log('M-Pesa C2B URLs registered successfully');
		} catch (error) {
			// Non-fatal: C2B registration failure should not prevent app startup.
			// Common in development with sandbox/placeholder credentials.
			const detail = error.response?.data
				? JSON.stringify(error.response.data)
				: error.message;
			this.logger.warn(`C2B URL registration failed (non-fatal): ${detail}`);
		}
	}

	// ── OAuth Token ─────────────────────────────────────────

	async getAccessToken(): Promise<string> {
		if (this.accessToken && this.tokenExpiry > Date.now()) {
			return this.accessToken;
		}

		const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');

		const { data } = await axios.get<DarajaOAuthResponse>(
			`${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
			{
				headers: { Authorization: `Basic ${auth}` },
				timeout: 15_000,
			},
		);

		this.accessToken = data.access_token;
		// 55-minute cache (5-min buffer before Daraja's 1-hour expiry)
		this.tokenExpiry = Date.now() + 55 * 60 * 1000;

		return this.accessToken;
	}

	// ── C2B URL Registration ────────────────────────────────

	async registerC2bUrls(): Promise<void> {
		const token = await this.getAccessToken();

		await axios.post(
			`${this.baseUrl}/mpesa/c2b/v1/registerurl`,
			{
				ShortCode: this.shortcode,
				ResponseType: 'Completed',
				ConfirmationURL: `${this.callbackBaseUrl}/mpesa/callback/confirmation`,
				ValidationURL: `${this.callbackBaseUrl}/mpesa/callback/validation`,
			},
			{
				headers: { Authorization: `Bearer ${token}` },
				timeout: 15_000,
			},
		);

		await this.auditService.createLog({
			action: AuditAction.C2B_URLS_REGISTERED,
			performedBy: undefined,
			targetType: AuditTargetType.PAYMENT,
			targetId: this.shortcode,
			details: `C2B URLs registered for shortcode ${this.shortcode}`,
			metadata: {
				shortcode: this.shortcode,
				confirmationUrl: `${this.callbackBaseUrl}/mpesa/callback/confirmation`,
				validationUrl: `${this.callbackBaseUrl}/mpesa/callback/validation`,
			},
		});
	}

	// ── STK Push ────────────────────────────────────────────

	async initiateStkPush(
		tenantId: string,
		amount: number,
		phone?: string,
	): Promise<{ paymentId: string; checkoutRequestId: string }> {
		const tenant = await this.tenantRepository.findOne({
			where: { tenantId },
			relations: ['user', 'unit', 'unit.property'],
		});

		if (!tenant) {
			throw new NotFoundException('Tenant not found');
		}

		const phoneNumber = this.formatPhoneNumber(phone || tenant.user.phone);
		const accountRef = tenant.unit?.unitNumber || tenantId;

		// Create PENDING payment
		const payment = await this.paymentsRepository.create({
			tenantId,
			amount,
			method: PaymentMethod.MPESA_STK_PUSH,
			status: PaymentStatus.PENDING,
			mpesaPhoneNumber: phoneNumber,
			transactionDate: new Date(),
		});

		try {
			const token = await this.getAccessToken();
			const timestamp = this.generateTimestamp();
			const password = Buffer.from(`${this.shortcode}${this.passkey}${timestamp}`).toString(
				'base64',
			);

			const { data } = await axios.post<StkPushResponse>(
				`${this.baseUrl}/mpesa/stkpush/v1/processrequest`,
				{
					BusinessShortCode: this.shortcode,
					Password: password,
					Timestamp: timestamp,
					TransactionType: 'CustomerPayBillOnline',
					Amount: Math.round(amount),
					PartyA: phoneNumber,
					PartyB: this.shortcode,
					PhoneNumber: phoneNumber,
					CallBackURL: `${this.callbackBaseUrl}/mpesa/callback/stk`,
					AccountReference: accountRef,
					TransactionDesc: `Rent payment for ${accountRef}`,
				},
				{
					headers: { Authorization: `Bearer ${token}` },
					timeout: 30_000,
				},
			);

			// Store CheckoutRequestID on the payment
			await this.paymentsRepository.update(
				{ paymentId: payment.paymentId },
				{ mpesaCheckoutRequestId: data.CheckoutRequestID },
			);

			await this.auditService.createLog({
				action: AuditAction.STK_PUSH_INITIATED,
				performedBy: tenant.userId,
				targetType: AuditTargetType.PAYMENT,
				targetId: payment.paymentId,
				details: `STK Push initiated for ${accountRef}: KES ${amount}`,
				metadata: {
					paymentId: payment.paymentId,
					tenantId,
					amount,
					phoneNumber,
					checkoutRequestId: data.CheckoutRequestID,
				},
			});

			return {
				paymentId: payment.paymentId,
				checkoutRequestId: data.CheckoutRequestID,
			};
		} catch (error) {
			// Mark payment as failed if Daraja call fails
			await this.paymentsRepository.update(
				{ paymentId: payment.paymentId },
				{ status: PaymentStatus.FAILED },
			);
			throw error;
		}
	}

	// ── STK Push Callback ───────────────────────────────────

	async handleStkCallback(body: StkCallbackBody): Promise<DarajaResultResponse> {
		const callback = body.Body.stkCallback;
		const { CheckoutRequestID, ResultCode, ResultDesc } = callback;

		this.logger.log(
			`STK Callback received: CheckoutRequestID=${CheckoutRequestID}, ResultCode=${ResultCode}`,
		);

		const queryRunner = this.dataSource.createQueryRunner();
		await queryRunner.connect();
		await queryRunner.startTransaction();

		try {
			// Find payment by CheckoutRequestID with pessimistic lock
			const payment = await queryRunner.manager
				.createQueryBuilder(Payment, 'payment')
				.setLock('pessimistic_write')
				.where('payment.mpesaCheckoutRequestId = :checkoutRequestId', {
					checkoutRequestId: CheckoutRequestID,
				})
				.getOne();

			if (!payment) {
				this.logger.warn(`No payment found for CheckoutRequestID: ${CheckoutRequestID}`);
				await queryRunner.rollbackTransaction();
				return { ResultCode: 0, ResultDesc: 'Accepted' };
			}

			// Idempotency: skip if already processed
			if (payment.status !== PaymentStatus.PENDING) {
				this.logger.log(
					`Payment ${payment.paymentId} already processed (status: ${payment.status}), skipping`,
				);
				await queryRunner.rollbackTransaction();
				return { ResultCode: 0, ResultDesc: 'Already processed' };
			}

			if (ResultCode === 0) {
				// Success — extract MpesaReceiptNumber from CallbackMetadata
				let mpesaReceiptNumber: string | undefined;
				let paidAmount: number | undefined;

				if (callback.CallbackMetadata?.Item) {
					for (const item of callback.CallbackMetadata.Item) {
						if (item.Name === 'MpesaReceiptNumber') {
							mpesaReceiptNumber = String(item.Value);
						}
						if (item.Name === 'Amount') {
							paidAmount = Number(item.Value);
						}
					}
				}

				const amount = paidAmount ?? Number(payment.amount);

				// Update payment to COMPLETED
				await queryRunner.manager.update(Payment, payment.paymentId, {
					status: PaymentStatus.COMPLETED,
					mpesaReceiptNumber,
				});

				await queryRunner.commitTransaction();

				// Post-commit: credit wallet and trigger settlement
				try {
					await this.walletService.credit(
						payment.tenantId,
						amount,
						mpesaReceiptNumber || `stk-${payment.paymentId}`,
						`M-Pesa STK Push payment`,
						undefined,
					);

					await this.auditService.createLog({
						action: AuditAction.STK_PUSH_CALLBACK_SUCCESS,
						performedBy: undefined,
						targetType: AuditTargetType.PAYMENT,
						targetId: payment.paymentId,
						details: `STK Push successful: KES ${amount} (Ref: ${mpesaReceiptNumber})`,
						metadata: {
							paymentId: payment.paymentId,
							tenantId: payment.tenantId,
							amount,
							mpesaReceiptNumber,
							checkoutRequestId: CheckoutRequestID,
						},
					});

					// Trigger invoice settlement
					await this.walletSettlementService.settleTenantInvoices(payment.tenantId);
				} catch (error) {
					this.logger.error(
						`Post-callback processing failed for payment ${payment.paymentId}: ${error.message}`,
						error.stack,
					);
				}
			} else {
				// Failed
				await queryRunner.manager.update(Payment, payment.paymentId, {
					status: PaymentStatus.FAILED,
				});

				await queryRunner.commitTransaction();

				await this.auditService.createLog({
					action: AuditAction.STK_PUSH_CALLBACK_FAILED,
					performedBy: undefined,
					targetType: AuditTargetType.PAYMENT,
					targetId: payment.paymentId,
					details: `STK Push failed: ${ResultDesc}`,
					metadata: {
						paymentId: payment.paymentId,
						tenantId: payment.tenantId,
						resultCode: ResultCode,
						resultDesc: ResultDesc,
						checkoutRequestId: CheckoutRequestID,
					},
				});
			}
		} catch (error) {
			await queryRunner.rollbackTransaction();
			this.logger.error(
				`STK callback processing failed for ${CheckoutRequestID}: ${error.message}`,
				error.stack,
			);
		} finally {
			await queryRunner.release();
		}

		return { ResultCode: 0, ResultDesc: 'Accepted' };
	}

	// ── C2B Validation ──────────────────────────────────────

	async handleC2bValidation(body: C2bBody): Promise<DarajaResultResponse> {
		const { BusinessShortCode, TransAmount, BillRefNumber, TransID } = body;

		this.logger.log(
			`C2B Validation: TransID=${TransID}, Paybill=${BusinessShortCode}, ` +
				`Account=${BillRefNumber}, Amount=${TransAmount}`,
		);

		// Validate shortcode matches configured shortcode
		if (BusinessShortCode !== this.shortcode) {
			this.logger.warn(`C2B Validation rejected: unknown shortcode ${BusinessShortCode}`);
			return { ResultCode: 1, ResultDesc: 'Rejected: Unknown business number' };
		}

		// Validate amount is positive
		const amount = parseFloat(TransAmount);
		if (isNaN(amount) || amount <= 0) {
			this.logger.warn(`C2B Validation rejected: invalid amount ${TransAmount}`);
			return { ResultCode: 1, ResultDesc: 'Rejected: Invalid amount' };
		}

		this.logger.log(`C2B Validation accepted: TransID=${TransID}`);
		return { ResultCode: 0, ResultDesc: 'Accepted' };
	}

	// ── C2B Confirmation ────────────────────────────────────

	async handleC2bConfirmation(body: C2bBody): Promise<DarajaResultResponse> {
		const {
			TransID: mpesaRef,
			BusinessShortCode: paybill,
			BillRefNumber: accountRef,
			TransAmount: amountStr,
			MSISDN: phone,
			FirstName: firstName,
		} = body;

		const amount = parseFloat(amountStr);
		const normalizedAccount = accountRef?.toString().trim().toUpperCase();

		this.logger.log(
			`C2B Confirmation: TransID=${mpesaRef}, Paybill=${paybill}, ` +
				`Account=${normalizedAccount}, Amount=${amount}, Phone=${phone}`,
		);

		// Idempotency check
		const existing = await this.paymentsRepository.findOne({
			where: { mpesaReceiptNumber: mpesaRef },
		});

		if (existing) {
			this.logger.log(`C2B Confirmation: duplicate callback ignored for ${mpesaRef}`);
			return { ResultCode: 0, ResultDesc: 'Already processed' };
		}

		// Try to match tenant by unit number
		const unit = await this.unitRepository.findOne({
			where: { unitNumber: ILike(normalizedAccount) },
		});

		let tenant: Tenant | null = null;
		if (unit) {
			tenant = await this.tenantRepository.findOne({
				where: { unitId: unit.unitId, status: TenantStatus.ACTIVE },
				relations: ['user'],
			});
		}

		if (tenant) {
			// Matched payment — create payment and credit wallet
			const payment = await this.paymentsRepository.create({
				tenantId: tenant.tenantId,
				amount,
				method: PaymentMethod.MPESA_PAYBILL,
				status: PaymentStatus.COMPLETED,
				mpesaReceiptNumber: mpesaRef,
				mpesaPhoneNumber: phone,
				mpesaAccountReference: normalizedAccount,
				mpesaPaybillNumber: paybill,
				transactionDate: new Date(),
				needsReconciliation: false,
			});

			await this.auditService.createLog({
				action: AuditAction.C2B_PAYMENT_RECEIVED,
				performedBy: tenant.userId,
				targetType: AuditTargetType.PAYMENT,
				targetId: payment.paymentId,
				details: `C2B payment received: KES ${amount} from ${firstName || phone} for ${normalizedAccount} (Ref: ${mpesaRef})`,
				metadata: {
					paymentId: payment.paymentId,
					tenantId: tenant.tenantId,
					amount,
					mpesaRef,
					phone,
					accountRef: normalizedAccount,
					paybill,
				},
			});

			// Credit wallet and trigger settlement (post-commit, non-blocking)
			try {
				await this.walletService.credit(
					tenant.tenantId,
					amount,
					mpesaRef,
					`M-Pesa C2B payment from ${phone}`,
					tenant.userId,
				);

				await this.walletSettlementService.settleTenantInvoices(tenant.tenantId);
			} catch (error) {
				this.logger.error(
					`Post-C2B processing failed for ${mpesaRef}: ${error.message}`,
					error.stack,
				);
			}

			this.logger.log(
				`C2B Confirmation: matched payment ${mpesaRef} to tenant ${tenant.tenantId} (${normalizedAccount})`,
			);
		} else {
			// Unmatched payment — flag for reconciliation
			const payment = await this.paymentsRepository.create({
				tenantId: undefined,
				amount,
				method: PaymentMethod.MPESA_PAYBILL,
				status: PaymentStatus.COMPLETED,
				mpesaReceiptNumber: mpesaRef,
				mpesaPhoneNumber: phone,
				mpesaAccountReference: normalizedAccount,
				mpesaPaybillNumber: paybill,
				transactionDate: new Date(),
				needsReconciliation: true,
				reconciliationNote: `Unmatched C2B payment. Account reference: ${normalizedAccount}`,
			});

			await this.auditService.createLog({
				action: AuditAction.C2B_PAYMENT_UNMATCHED,
				performedBy: undefined,
				targetType: AuditTargetType.PAYMENT,
				targetId: payment.paymentId,
				details: `Unmatched C2B payment: KES ${amount} from ${phone}, account: ${normalizedAccount} (Ref: ${mpesaRef})`,
				metadata: {
					paymentId: payment.paymentId,
					amount,
					mpesaRef,
					phone,
					accountRef: normalizedAccount,
					paybill,
				},
			});

			this.logger.warn(
				`C2B Confirmation: unmatched payment ${mpesaRef} for account ${normalizedAccount}`,
			);
		}

		return { ResultCode: 0, ResultDesc: 'Success' };
	}

	// ── STK Status Check ────────────────────────────────────

	async getStkStatus(
		paymentId: string,
		tenantId: string,
	): Promise<{ status: PaymentStatus; resultDesc?: string }> {
		const payment = await this.paymentsRepository.findOne({
			where: { paymentId },
		});

		if (!payment) {
			throw new NotFoundException('Payment not found');
		}

		// Ensure the payment belongs to the requesting tenant
		if (payment.tenantId !== tenantId) {
			throw new NotFoundException('Payment not found');
		}

		return {
			status: payment.status,
		};
	}

	// ── Helpers ─────────────────────────────────────────────

	formatPhoneNumber(phone: string): string {
		let cleaned = phone.replace(/[\s\-+]/g, '');

		if (cleaned.startsWith('0')) {
			cleaned = `254${cleaned.slice(1)}`;
		} else if (cleaned.startsWith('+254')) {
			cleaned = cleaned.slice(1);
		} else if (!cleaned.startsWith('254')) {
			cleaned = `254${cleaned}`;
		}

		return cleaned;
	}

	private generateTimestamp(): string {
		const now = new Date();
		const year = now.getFullYear();
		const month = String(now.getMonth() + 1).padStart(2, '0');
		const day = String(now.getDate()).padStart(2, '0');
		const hours = String(now.getHours()).padStart(2, '0');
		const minutes = String(now.getMinutes()).padStart(2, '0');
		const seconds = String(now.getSeconds()).padStart(2, '0');
		return `${year}${month}${day}${hours}${minutes}${seconds}`;
	}
}
