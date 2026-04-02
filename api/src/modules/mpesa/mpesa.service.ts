import { AuditAction } from '@/common/enums/audit-action.enum';
import { AuditTargetType } from '@/common/enums/audit-target-type.enum';
import { AuditService } from '@/modules/audit/audit.service';
import { WalletSettlementService } from '@/modules/invoices/wallet-settlement.service';
import { OrganizationsService } from '@/modules/organizations/organizations.service';
import { Payment, PaymentMethod, PaymentStatus } from '@/modules/payments/entities/payment.entity';
import { PaymentsRepository } from '@/modules/payments/payments.repository';
import { Tenant, TenantStatus } from '@/modules/tenants/entities/tenant.entity';
import { Unit } from '@/modules/units/entities/unit.entity';
import { WalletService } from '@/modules/wallet/wallet.service';
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

interface MpesaCredentials {
	consumerKey: string;
	consumerSecret: string;
	passkey: string;
	shortcode: string;
	environment: string;
	callbackBaseUrl: string;
	baseUrl: string;
}

interface CachedToken {
	token: string;
	expiry: number;
}

@Injectable()
export class MpesaService implements OnModuleInit {
	private readonly logger = new Logger(MpesaService.name);

	/** Per-shortcode access token cache (different orgs have different API keys) */
	private readonly tokenCache = new Map<string, CachedToken>();

	/** Default .env credentials (backward compatibility) */
	private readonly defaultEnvironment: string;
	private readonly defaultBaseUrl: string;
	private readonly defaultConsumerKey: string;
	private readonly defaultConsumerSecret: string;
	private readonly defaultPasskey: string;
	private readonly defaultShortcode: string;
	private readonly defaultCallbackBaseUrl: string;

	constructor(
		private readonly configService: ConfigService,
		private readonly dataSource: DataSource,
		private readonly paymentsRepository: PaymentsRepository,
		private readonly walletService: WalletService,
		@Inject(forwardRef(() => WalletSettlementService))
		private readonly walletSettlementService: WalletSettlementService,
		private readonly auditService: AuditService,
		private readonly organizationsService: OrganizationsService,
		@InjectRepository(Tenant)
		private readonly tenantRepository: Repository<Tenant>,
		@InjectRepository(Unit)
		private readonly unitRepository: Repository<Unit>,
	) {
		this.defaultEnvironment = this.configService.get<string>('MPESA_ENVIRONMENT', 'sandbox');
		this.defaultBaseUrl =
			this.defaultEnvironment === 'production'
				? 'https://api.safaricom.co.ke'
				: 'https://sandbox.safaricom.co.ke';
		this.defaultConsumerKey = this.configService.get<string>('MPESA_CONSUMER_KEY', '');
		this.defaultConsumerSecret = this.configService.get<string>('MPESA_CONSUMER_SECRET', '');
		this.defaultPasskey = this.configService.get<string>('MPESA_PASSKEY', '');
		this.defaultShortcode = this.configService.get<string>('MPESA_SHORTCODE', '');
		this.defaultCallbackBaseUrl = this.configService.get<string>('MPESA_CALLBACK_BASE_URL', '');
	}

	async onModuleInit(): Promise<void> {
		// Register C2B URLs for all organizations with configured M-Pesa credentials
		this.registerC2bUrlsForAllOrgs().catch(() => {
			// Already logged inside the method
		});
	}

	/**
	 * Registers C2B callback URLs for every organization that has
	 * M-Pesa credentials configured, plus the .env default if set.
	 * Runs on startup and is fire-and-forget (logs errors, doesn't throw).
	 */
	private async registerC2bUrlsForAllOrgs(): Promise<void> {
		const registered = new Set<string>();

		// 1. Register for .env default credentials (backward compatibility)
		if (this.defaultConsumerKey && this.defaultConsumerSecret && this.defaultShortcode && this.defaultCallbackBaseUrl) {
			try {
				await this.registerC2bUrlsWithRetry(3, 5000);
				registered.add(this.defaultShortcode);
				this.logger.log(`C2B URLs registered for .env default shortcode ${this.defaultShortcode}`);
			} catch {
				// Already logged in registerC2bUrlsWithRetry
			}
		} else {
			this.logger.log('M-Pesa .env credentials not fully configured, skipping .env C2B registration');
		}

		// 2. Register for each organization with configured M-Pesa credentials
		try {
			const orgs = await this.organizationsService.findAllWithMpesaConfigured();

			if (orgs.length === 0) {
				this.logger.log('No organizations with M-Pesa credentials found, skipping org C2B registration');
				return;
			}

			for (const org of orgs) {
				// Skip if already registered via .env default (same shortcode)
				if (registered.has(org.mpesaShortcode!)) {
					this.logger.log(
						`Skipping C2B registration for org "${org.name}" — shortcode ${org.mpesaShortcode} already registered via .env`,
					);
					continue;
				}

				try {
					await this.registerC2bUrlsWithRetry(2, 3000, org.organizationId);
					registered.add(org.mpesaShortcode!);
					this.logger.log(
						`C2B URLs registered for org "${org.name}" (shortcode ${org.mpesaShortcode})`,
					);
				} catch {
					this.logger.warn(
						`C2B URL registration failed for org "${org.name}" (shortcode ${org.mpesaShortcode}). ` +
							`Use POST /payments/mobile/register-c2b to retry.`,
					);
				}
			}
		} catch (error) {
			this.logger.error(`Failed to query organizations for C2B registration: ${error.message}`);
		}
	}

	// ── Credential Resolution ──────────────────────────────

	/**
	 * Resolves M-Pesa credentials for a given organization.
	 * Tries org-level credentials first, falls back to .env defaults.
	 * Callback URL always uses the server's .env MPESA_CALLBACK_BASE_URL
	 * because all Daraja callbacks hit this single API server — routing
	 * to the correct org is done via BusinessShortCode in the payload.
	 */
	private async resolveCredentials(organizationId?: string): Promise<MpesaCredentials> {
		if (organizationId) {
			try {
				const orgCreds =
					await this.organizationsService.getDecryptedMpesaCredentials(organizationId);

				if (orgCreds && orgCreds.consumerKey && orgCreds.consumerSecret && orgCreds.shortcode) {
					const environment = orgCreds.environment || this.defaultEnvironment;
					return {
						consumerKey: orgCreds.consumerKey,
						consumerSecret: orgCreds.consumerSecret,
						passkey: orgCreds.passkey,
						shortcode: orgCreds.shortcode,
						environment,
						callbackBaseUrl: this.defaultCallbackBaseUrl,
						baseUrl:
							environment === 'production'
								? 'https://api.safaricom.co.ke'
								: 'https://sandbox.safaricom.co.ke',
					};
				}
			} catch (error) {
				this.logger.warn(
					`Failed to resolve org credentials for ${organizationId}, falling back to .env: ${error.message}`,
				);
			}
		}

		// Fall back to .env defaults
		return {
			consumerKey: this.defaultConsumerKey,
			consumerSecret: this.defaultConsumerSecret,
			passkey: this.defaultPasskey,
			shortcode: this.defaultShortcode,
			environment: this.defaultEnvironment,
			callbackBaseUrl: this.defaultCallbackBaseUrl,
			baseUrl: this.defaultBaseUrl,
		};
	}

	// ── OAuth Token ─────────────────────────────────────────

	async getAccessToken(credentials: MpesaCredentials): Promise<string> {
		const cacheKey = credentials.shortcode;
		const cached = this.tokenCache.get(cacheKey);

		if (cached && cached.expiry > Date.now()) {
			return cached.token;
		}

		const auth = Buffer.from(
			`${credentials.consumerKey}:${credentials.consumerSecret}`,
		).toString('base64');

		const { data } = await axios.get<DarajaOAuthResponse>(
			`${credentials.baseUrl}/oauth/v2/generate?grant_type=client_credentials`,
			{
				headers: { Authorization: `Basic ${auth}` },
				timeout: 15_000,
			},
		);

		// 55-minute cache (5-min buffer before Daraja's 1-hour expiry)
		this.tokenCache.set(cacheKey, {
			token: data.access_token,
			expiry: Date.now() + 55 * 60 * 1000,
		});

		return data.access_token;
	}

	// ── C2B URL Registration ────────────────────────────────

	async registerC2bUrls(organizationId?: string): Promise<void> {
		const credentials = await this.resolveCredentials(organizationId);

		if (!credentials.consumerKey || !credentials.shortcode || !credentials.callbackBaseUrl) {
			throw new Error(
				'M-Pesa credentials not fully configured' +
					(organizationId ? ` for organization ${organizationId}` : ''),
			);
		}

		const token = await this.getAccessToken(credentials);

		try {
			await axios.post(
				`${credentials.baseUrl}/mpesa/c2b/v2/registerurl`,
				{
					ShortCode: credentials.shortcode,
					ResponseType: 'Completed',
					ConfirmationURL: `${credentials.callbackBaseUrl}/payments/mobile/callback/confirmation`,
					ValidationURL: `${credentials.callbackBaseUrl}/payments/mobile/callback/validation`,
				},
				{
					headers: { Authorization: `Bearer ${token}` },
					timeout: 15_000,
				},
			);
		} catch (error) {
			const errorMessage = error?.response?.data?.errorMessage || '';
			if (errorMessage.includes('already registered')) {
				this.logger.log('C2B URLs already registered with Safaricom');
				// Fall through to audit log below
			} else {
				this.invalidateTokenOnAuthError(error, credentials.shortcode);
				throw error;
			}
		}

		await this.auditService.createLog({
			action: AuditAction.C2B_URLS_REGISTERED,
			performedBy: undefined,
			targetType: AuditTargetType.PAYMENT,
			targetId: credentials.shortcode,
			details: `C2B URLs registered for shortcode ${credentials.shortcode}`,
			metadata: {
				shortcode: credentials.shortcode,
				organizationId,
				confirmationUrl: `${credentials.callbackBaseUrl}/payments/mobile/callback/confirmation`,
				validationUrl: `${credentials.callbackBaseUrl}/payments/mobile/callback/validation`,
			},
		});
	}

	private async registerC2bUrlsWithRetry(
		maxAttempts: number,
		initialDelay: number,
		organizationId?: string,
	): Promise<void> {
		for (let attempt = 1; attempt <= maxAttempts; attempt++) {
			try {
				await this.registerC2bUrls(organizationId);
				this.logger.log(`M-Pesa C2B URLs registered successfully (attempt ${attempt}/${maxAttempts})`);
				return;
			} catch (error) {
				const detail = error.response?.data
					? JSON.stringify(error.response.data)
					: error.message;

				if (attempt < maxAttempts) {
					const delay = initialDelay * Math.pow(2, attempt - 1);
					this.logger.warn(
						`C2B URL registration failed (attempt ${attempt}/${maxAttempts}), retrying in ${delay / 1000}s: ${detail}`,
					);
					await new Promise((resolve) => setTimeout(resolve, delay));
				} else {
					this.logger.error(
						`C2B URL registration failed after ${maxAttempts} attempts: ${detail}. ` +
							`Use POST /payments/mobile/register-c2b to retry manually.`,
					);
				}
			}
		}
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

		// Resolve per-org credentials using tenant's organizationId
		const credentials = await this.resolveCredentials(tenant.organizationId);

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
			const token = await this.getAccessToken(credentials);
			const timestamp = this.generateTimestamp();
			const password = Buffer.from(
				`${credentials.shortcode}${credentials.passkey}${timestamp}`,
			).toString('base64');

			let data: StkPushResponse;
			try {
				const response = await axios.post<StkPushResponse>(
					`${credentials.baseUrl}/mpesa/stkpush/v1/processrequest`,
					{
						BusinessShortCode: credentials.shortcode,
						Password: password,
						Timestamp: timestamp,
						TransactionType: 'CustomerPayBillOnline',
						Amount: Math.round(amount),
						PartyA: phoneNumber,
						PartyB: credentials.shortcode,
						PhoneNumber: phoneNumber,
						CallBackURL: `${credentials.callbackBaseUrl}/payments/mobile/callback/stk`,
						AccountReference: accountRef,
						TransactionDesc: `Rent payment for ${accountRef}`,
					},
					{
						headers: { Authorization: `Bearer ${token}` },
						timeout: 30_000,
					},
				);
				data = response.data;
			} catch (stkError) {
				this.invalidateTokenOnAuthError(stkError, credentials.shortcode);
				throw stkError;
			}

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
					organizationId: tenant.organizationId,
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
					// Resolve tenant userId for audit logging
					const tenant = await this.tenantRepository.findOne({
						where: { tenantId: payment.tenantId },
					});
					const tenantUserId = tenant?.userId;

					await this.walletService.credit(
						payment.tenantId,
						amount,
						mpesaReceiptNumber || `stk-${payment.paymentId}`,
						`M-Pesa STK Push payment`,
						tenantUserId,
					);

					await this.auditService.createLog({
						action: AuditAction.STK_PUSH_CALLBACK_SUCCESS,
						performedBy: tenantUserId,
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

				// Resolve tenant userId for audit logging
				const failedTenant = await this.tenantRepository.findOne({
					where: { tenantId: payment.tenantId },
				});

				await this.auditService.createLog({
					action: AuditAction.STK_PUSH_CALLBACK_FAILED,
					performedBy: failedTenant?.userId,
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

		// Look up organization by shortcode (supports per-org paybills)
		const org = await this.organizationsService.findByShortcode(BusinessShortCode);
		const isDefaultShortcode = BusinessShortCode === this.defaultShortcode && this.defaultShortcode;

		if (!org && !isDefaultShortcode) {
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

		// Resolve organization by shortcode for org-scoped unit lookup
		const org = await this.organizationsService.findByShortcode(paybill);
		const resolvedOrgId = org?.organizationId;

		// Try to match tenant by unit number, scoped to the resolved organization
		let unit: Unit | null = null;
		if (resolvedOrgId) {
			unit = await this.unitRepository.findOne({
				where: {
					unitNumber: ILike(normalizedAccount),
					organizationId: resolvedOrgId,
				},
			});
		} else {
			// Fallback: no org scoping (backward compat with .env shortcode)
			unit = await this.unitRepository.findOne({
				where: { unitNumber: ILike(normalizedAccount) },
			});
		}

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
					organizationId: resolvedOrgId,
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
					organizationId: resolvedOrgId,
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

	// ── Admin STK Status Check (no tenant ownership check) ──

	async getStkStatusAdmin(
		paymentId: string,
	): Promise<{ status: PaymentStatus; resultDesc?: string }> {
		const payment = await this.paymentsRepository.findOne({
			where: { paymentId },
		});

		if (!payment) {
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

	private invalidateTokenOnAuthError(error: any, shortcode?: string): void {
		if (error?.response?.status === 401 || error?.response?.data?.errorCode?.startsWith('401')) {
			this.logger.warn('Daraja returned 401, invalidating cached access token');
			if (shortcode) {
				this.tokenCache.delete(shortcode);
			} else {
				this.tokenCache.clear();
			}
		}
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
