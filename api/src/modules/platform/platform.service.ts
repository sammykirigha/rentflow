import { AuditAction } from '@/common/enums/audit-action.enum';
import { AuditTargetType } from '@/common/enums/audit-target-type.enum';
import { UserRole } from '@/common/enums/user-role.enum';
import { UserStatus } from '@/common/enums/user-status.enum';
import { JwtPayload } from '@/common/interfaces/jwt-payload.interface';
import authConfig from '@/config/auth.config';
import { AuditService } from '@/modules/audit/audit.service';
import { OrganizationsService } from '@/modules/organizations/organizations.service';
import { Role } from '@/modules/permissions/entities/role.entity';
import { SubscriptionsService } from '@/modules/subscriptions/subscriptions.service';
import { User } from '@/modules/users/entities/user.entity';
import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { DataSource, In, Repository } from 'typeorm';
import { AuditLog } from '@/modules/audit/entities/audit-log.entity';
import { Notification } from '@/modules/notifications/entities/notification.entity';
import { SubscriptionStatus } from '@/modules/subscriptions/entities/subscription.entity';
import { MailService } from '../mail/mail.service';
import { Organization, OrganizationStatus } from '../organizations/entities/organization.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { UpdateOrganizationDto } from '@/modules/organizations/dto/update-organization.dto';
import { CreateOrganizationWithOwnerDto } from './dto/create-organization-with-owner.dto';
import { PlatformConfig } from './entities/platform-config.entity';

@Injectable()
export class PlatformService {
	private readonly logger = new Logger(PlatformService.name);

	constructor(
		private readonly organizationsService: OrganizationsService,
		private readonly subscriptionsService: SubscriptionsService,
		private readonly auditService: AuditService,
		private readonly jwtService: JwtService,
		private readonly configService: ConfigService,
		private readonly mailService: MailService,
		private readonly dataSource: DataSource,
		@InjectRepository(Organization)
		private readonly organizationRepository: Repository<Organization>,
		@InjectRepository(Subscription)
		private readonly subscriptionRepository: Repository<Subscription>,
		@InjectRepository(PlatformConfig)
		private readonly platformConfigRepository: Repository<PlatformConfig>,
		@InjectRepository(User)
		private readonly userRepository: Repository<User>,
		@InjectRepository(Role)
		private readonly roleRepository: Repository<Role>,
	) {}

	private static readonly PLAN_PRICES: Record<string, number> = {
		basic: 2999,
		pro: 5999,
		enterprise: 14999,
	};

	async getDashboardStats() {
		const totalOrgs = await this.organizationRepository.count();
		const activeOrgs = await this.organizationRepository.count({
			where: { status: OrganizationStatus.ACTIVE },
		});
		const trialOrgs = await this.organizationRepository.count({
			where: { status: OrganizationStatus.TRIAL },
		});
		const suspendedOrgs = await this.organizationRepository.count({
			where: { status: OrganizationStatus.SUSPENDED },
		});

		// MRR: sum plan prices for active subscriptions
		const activeSubscriptions = await this.subscriptionRepository.find({
			where: { status: In([SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL]) },
		});
		const mrr = activeSubscriptions.reduce((sum, sub) => {
			return sum + (PlatformService.PLAN_PRICES[sub.plan] || 0);
		}, 0);

		// Org Growth: monthly counts for last 12 months
		const twelveMonthsAgo = new Date();
		twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

		const growthRows = await this.organizationRepository
			.createQueryBuilder('org')
			.select("TO_CHAR(org.createdAt, 'YYYY-MM')", 'month')
			.addSelect('COUNT(*)::int', 'count')
			.where('org.createdAt >= :twelveMonthsAgo', { twelveMonthsAgo })
			.groupBy("TO_CHAR(org.createdAt, 'YYYY-MM')")
			.orderBy("TO_CHAR(org.createdAt, 'YYYY-MM')", 'ASC')
			.getRawMany();
		const orgGrowth = growthRows.map((r) => ({
			month: r.month,
			count: parseInt(r.count, 10),
		}));

		// Trial expiring within 7 days
		const sevenDaysFromNow = new Date();
		sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

		const trialExpiring = await this.subscriptionRepository
			.createQueryBuilder('sub')
			.innerJoin('sub.organization', 'org')
			.innerJoin(User, 'owner', 'org.owner_user_id = owner.user_id')
			.select([
				'org.organization_id AS "organizationId"',
				'org.name AS "orgName"',
				'owner.email AS "ownerEmail"',
				'sub.trial_ends_at AS "trialEndsAt"',
				"EXTRACT(DAY FROM sub.trial_ends_at - NOW())::int AS \"daysRemaining\"",
			])
			.where('sub.status = :status', { status: SubscriptionStatus.TRIAL })
			.andWhere('sub.trial_ends_at <= :sevenDaysFromNow', { sevenDaysFromNow })
			.andWhere('sub.trial_ends_at >= NOW()')
			.orderBy('"daysRemaining"', 'ASC')
			.getRawMany();

		// Plan distribution
		const planDistRows = await this.subscriptionRepository
			.createQueryBuilder('sub')
			.select('sub.plan', 'plan')
			.addSelect('COUNT(*)::int', 'count')
			.where('sub.status IN (:...statuses)', { statuses: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] })
			.groupBy('sub.plan')
			.getRawMany();
		const planDistribution = planDistRows.map((r) => ({
			plan: r.plan,
			count: parseInt(r.count, 10),
		}));

		// Recent activity: latest 20 audit logs
		const recentActivity = await this.dataSource
			.getRepository(AuditLog)
			.createQueryBuilder('audit')
			.leftJoinAndSelect('audit.performer', 'performer')
			.orderBy('audit.createdAt', 'DESC')
			.take(20)
			.getMany();

		// SMS usage this month
		const monthStart = new Date();
		monthStart.setDate(1);
		monthStart.setHours(0, 0, 0, 0);

		const smsThisMonth = await this.dataSource
			.getRepository(Notification)
			.createQueryBuilder('notif')
			.where("notif.channel IN ('sms', 'both')")
			.andWhere('notif.createdAt >= :monthStart', { monthStart })
			.getCount();

		return {
			totalOrganizations: totalOrgs,
			activeOrganizations: activeOrgs,
			trialOrganizations: trialOrgs,
			suspendedOrganizations: suspendedOrgs,
			mrr,
			orgGrowth,
			trialExpiring,
			planDistribution,
			recentActivity: recentActivity.map((a) => ({
				auditId: a.auditId,
				action: a.action,
				targetType: a.targetType,
				details: a.details,
				createdAt: a.createdAt,
				performerName: a.performer
					? `${a.performer.firstName || ''} ${a.performer.lastName || ''}`.trim()
					: 'System',
			})),
			smsThisMonth,
		};
	}

	async getOrganizations(
		page = 1,
		limit = 20,
		status?: OrganizationStatus,
		search?: string,
	) {
		const skip = (page - 1) * limit;

		const qb = this.organizationRepository
			.createQueryBuilder('org')
			.orderBy('org.createdAt', 'DESC')
			.skip(skip)
			.take(limit);

		if (status) {
			qb.andWhere('org.status = :status', { status });
		}

		if (search) {
			qb.andWhere('(org.name ILIKE :search OR org.slug ILIKE :search)', {
				search: `%${search}%`,
			});
		}

		const [organizations, total] = await qb.getManyAndCount();

		return {
			data: organizations,
			pagination: {
				page,
				limit,
				total,
				totalPages: Math.ceil(total / limit),
			},
		};
	}

	async createOrganizationWithOwner(
		dto: CreateOrganizationWithOwnerDto,
		adminUserId: string,
	) {
		// Check slug uniqueness
		const existingBySlug = await this.organizationRepository.findOne({
			where: { slug: dto.slug },
		});
		if (existingBySlug) {
			throw new ConflictException('An organization with this slug already exists');
		}

		// Check email uniqueness
		const existingByEmail = await this.userRepository.findOne({
			where: { email: dto.ownerEmail },
		});
		if (existingByEmail) {
			throw new ConflictException('A user with this email already exists');
		}

		// Find ORG_OWNER role
		const ownerRole = await this.roleRepository.findOne({
			where: { name: UserRole.ORG_OWNER },
		});
		if (!ownerRole) {
			throw new Error('ORG_OWNER role not found. Please run seeds.');
		}

		// Generate random password
		const plainPassword =
			crypto.randomBytes(9).toString('base64url').slice(0, 10) + 'A1!';

		const hashedPassword = await bcrypt.hash(plainPassword, authConfig.bcryptRounds);

		let organization: Organization;
		let subscription: Subscription;
		let user: User;

		await this.dataSource.transaction(async (manager) => {
			// Create user
			user = await manager.save(
				manager.create(User, {
					email: dto.ownerEmail,
					password: hashedPassword,
					firstName: dto.ownerFirstName,
					lastName: dto.ownerLastName,
					phone: dto.ownerPhone,
					roleId: ownerRole.roleId,
					status: UserStatus.ACTIVE,
					mustChangePassword: true,
				}),
			);

			// Create organization
			organization = await manager.save(
				manager.create(Organization, {
					name: dto.name,
					slug: dto.slug,
					ownerUserId: user.userId,
					status: OrganizationStatus.TRIAL,
				}),
			);

			// Link user to organization
			await manager.update(User, user.userId, {
				organizationId: organization.organizationId,
			});

			// Create subscription
			const trialEndsAt = new Date();
			trialEndsAt.setDate(trialEndsAt.getDate() + 14);

			const subscriptionData = manager.create(Subscription, {} as Partial<Subscription>);
			subscriptionData.organizationId = organization.organizationId;
			subscriptionData.plan = (dto.plan || 'pro') as any;
			subscriptionData.status = 'trial' as any;
			subscriptionData.trialEndsAt = trialEndsAt;
			subscriptionData.currentPeriodStart = new Date();
			subscriptionData.currentPeriodEnd = trialEndsAt;
			subscriptionData.maxProperties = 10;
			subscriptionData.maxUnits = 200;
			subscriptionData.smsQuotaMonthly = 500;
			subscriptionData.maxManagerUsers = 5;
			subscriptionData.hasPdfExport = true;
			subscriptionData.hasBulkMessaging = true;
			subscriptionData.hasApiAccess = false;

			subscription = await manager.save(subscriptionData);
		});

		// Send welcome email (awaited so we can report status)
		const frontendUrl = this.configService.get('FRONTEND_URL', 'http://localhost:3001');
		const loginUrl = `${frontendUrl}/login`;
		let emailSent = false;

		try {
			const result = await this.mailService.sendEmail({
				to: dto.ownerEmail,
				subject: `Welcome to RentFlow — Your "${dto.name}" Organization is Ready`,
				html: `
				<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
					<h2 style="color: #1890ff;">Welcome to RentFlow</h2>
					<p>Hello <strong>${dto.ownerFirstName}</strong>,</p>
					<p>Your organization <strong>${dto.name}</strong> has been created on RentFlow. Here are your login credentials:</p>
					<div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
						<p style="margin: 4px 0;"><strong>Organization:</strong> ${dto.name}</p>
						<p style="margin: 4px 0;"><strong>Email:</strong> ${dto.ownerEmail}</p>
						<p style="margin: 4px 0;"><strong>Password:</strong> ${plainPassword}</p>
					</div>
					<div style="text-align: center; margin: 24px 0;">
						<a href="${loginUrl}" style="background: #1890ff; color: #ffffff; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">Login to RentFlow</a>
					</div>
					<p style="color: #ff4d4f;"><strong>You will be required to change your password on first login.</strong></p>
					<hr style="border: none; border-top: 1px solid #e8e8e8; margin: 24px 0;" />
					<p style="color: #888; font-size: 12px;">This is an automated message from RentFlow.</p>
				</div>
				`,
			});
			emailSent = !!result;
		} catch (err) {
			this.logger.error(
				`Failed to send welcome email to ${dto.ownerEmail}: ${err.message}`,
			);
		}

		// Audit log
		await this.auditService.createLog({
			action: AuditAction.ORGANIZATION_CREATED,
			performedBy: adminUserId,
			targetType: AuditTargetType.ORGANIZATION,
			targetId: organization.organizationId,
			details: `Created organization "${dto.name}" with owner ${dto.ownerEmail}`,
			metadata: {
				ownerEmail: dto.ownerEmail,
				slug: dto.slug,
			},
		});

		return {
			organization,
			subscription,
			ownerEmail: dto.ownerEmail,
			temporaryPassword: plainPassword,
			emailSent,
		};
	}

	async getOrganizationDetail(organizationId: string) {
		const org = await this.organizationsService.findOne(organizationId);
		const subscription = await this.subscriptionsService.findByOrganization(organizationId);

		// Fetch owner user details
		let owner: { email?: string; firstName?: string; lastName?: string; phone?: string } | null = null;
		if (org.ownerUserId) {
			const ownerUser = await this.userRepository.findOne({
				where: { userId: org.ownerUserId },
			});
			if (ownerUser) {
				owner = {
					email: ownerUser.email,
					firstName: ownerUser.firstName,
					lastName: ownerUser.lastName,
					phone: ownerUser.phone,
				};
			}
		}

		return {
			organization: org,
			subscription,
			owner,
		};
	}

	async updateOrganization(
		organizationId: string,
		dto: UpdateOrganizationDto,
		adminUserId: string,
	) {
		const org = await this.organizationsService.update(organizationId, dto);

		await this.auditService.createLog({
			action: AuditAction.ORGANIZATION_UPDATED,
			performedBy: adminUserId,
			targetType: AuditTargetType.ORGANIZATION,
			targetId: organizationId,
			details: `Organization "${org.name}" updated by super admin`,
			metadata: { updatedFields: Object.keys(dto) },
		});

		return org;
	}

	async resendInvitation(organizationId: string, adminUserId: string) {
		const org = await this.organizationsService.findOne(organizationId);

		// Find the owner user
		const owner = await this.userRepository.findOne({
			where: { userId: org.ownerUserId },
		});
		if (!owner) {
			throw new Error('Organization owner user not found');
		}

		// Generate a new temporary password
		const plainPassword =
			crypto.randomBytes(9).toString('base64url').slice(0, 10) + 'A1!';
		const hashedPassword = await bcrypt.hash(plainPassword, authConfig.bcryptRounds);

		// Update user password and force change
		await this.userRepository.update(owner.userId, {
			password: hashedPassword,
			mustChangePassword: true,
		});

		// Send the welcome email
		const frontendUrl = this.configService.get('FRONTEND_URL', 'http://localhost:3001');
		const loginUrl = `${frontendUrl}/login`;

		await this.mailService.sendEmail({
			to: owner.email,
			subject: `RentFlow — Your Login Credentials for "${org.name}"`,
			html: `
			<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
				<h2 style="color: #1890ff;">RentFlow Login Credentials</h2>
				<p>Hello <strong>${owner.firstName}</strong>,</p>
				<p>Your login credentials for <strong>${org.name}</strong> on RentFlow have been reset. Please use the new credentials below:</p>
				<div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
					<p style="margin: 4px 0;"><strong>Organization:</strong> ${org.name}</p>
					<p style="margin: 4px 0;"><strong>Email:</strong> ${owner.email}</p>
					<p style="margin: 4px 0;"><strong>Password:</strong> ${plainPassword}</p>
				</div>
				<div style="text-align: center; margin: 24px 0;">
					<a href="${loginUrl}" style="background: #1890ff; color: #ffffff; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">Login to RentFlow</a>
				</div>
				<p style="color: #ff4d4f;"><strong>You will be required to change your password on first login.</strong></p>
				<hr style="border: none; border-top: 1px solid #e8e8e8; margin: 24px 0;" />
				<p style="color: #888; font-size: 12px;">This is an automated message from RentFlow.</p>
			</div>
			`,
		});

		await this.auditService.createLog({
			action: AuditAction.ORGANIZATION_UPDATED,
			performedBy: adminUserId,
			targetType: AuditTargetType.ORGANIZATION,
			targetId: organizationId,
			details: `Invitation resent to ${owner.email} for organization "${org.name}"`,
			metadata: { ownerEmail: owner.email },
		});

		return { success: true, email: owner.email };
	}

	async updateOrganizationOwner(
		organizationId: string,
		body: { firstName?: string; lastName?: string; email?: string; phone?: string },
		adminUserId: string,
	) {
		const org = await this.organizationsService.findOne(organizationId);
		if (!org.ownerUserId) {
			throw new Error('Organization has no owner');
		}

		const owner = await this.userRepository.findOne({
			where: { userId: org.ownerUserId },
		});
		if (!owner) {
			throw new Error('Owner user not found');
		}

		// Check email uniqueness if changing
		if (body.email && body.email !== owner.email) {
			const existingByEmail = await this.userRepository.findOne({
				where: { email: body.email },
			});
			if (existingByEmail) {
				throw new ConflictException('A user with this email already exists');
			}
		}

		const updateData: Partial<User> = {};
		if (body.firstName !== undefined) updateData.firstName = body.firstName;
		if (body.lastName !== undefined) updateData.lastName = body.lastName;
		if (body.email !== undefined) updateData.email = body.email;
		if (body.phone !== undefined) updateData.phone = body.phone;

		await this.userRepository.update(owner.userId, updateData);

		await this.auditService.createLog({
			action: AuditAction.ORGANIZATION_UPDATED,
			performedBy: adminUserId,
			targetType: AuditTargetType.USER,
			targetId: owner.userId,
			details: `Owner of "${org.name}" updated by super admin`,
			metadata: { updatedFields: Object.keys(updateData) },
		});

		return { ...owner, ...updateData };
	}

	async suspendOrganization(organizationId: string, adminUserId: string) {
		const org = await this.organizationsService.suspend(organizationId);

		await this.auditService.createLog({
			action: AuditAction.ORGANIZATION_SUSPENDED,
			performedBy: adminUserId,
			targetType: AuditTargetType.ORGANIZATION,
			targetId: organizationId,
			details: `Organization "${org.name}" suspended`,
		});

		return org;
	}

	async activateOrganization(organizationId: string, adminUserId: string) {
		const org = await this.organizationsService.activate(organizationId);

		await this.auditService.createLog({
			action: AuditAction.ORGANIZATION_REACTIVATED,
			performedBy: adminUserId,
			targetType: AuditTargetType.ORGANIZATION,
			targetId: organizationId,
			details: `Organization "${org.name}" activated`,
		});

		return org;
	}

	async createImpersonationToken(
		organizationId: string,
		superAdminUserId: string,
	): Promise<string> {
		const org = await this.organizationsService.findOne(organizationId);

		const payload: JwtPayload = {
			sub: org.ownerUserId,
			email: '', // will be populated by JWT strategy on validate
			role: '',
			organizationId: org.organizationId,
			isSuperAdmin: false,
			impersonatedBy: superAdminUserId,
		};

		await this.auditService.createLog({
			action: AuditAction.IMPERSONATION_STARTED,
			performedBy: superAdminUserId,
			targetType: AuditTargetType.ORGANIZATION,
			targetId: organizationId,
			details: `Super admin started impersonating organization "${org.name}"`,
			metadata: { impersonatedOrgId: organizationId },
		});

		// 1-hour token
		return this.jwtService.sign(payload, {
			secret: this.configService.get('JWT_SECRET'),
			expiresIn: '1h',
		});
	}

	async getConfig(): Promise<PlatformConfig[]> {
		return this.platformConfigRepository.find();
	}

	async updateConfig(key: string, value: string, description?: string): Promise<PlatformConfig> {
		let config = await this.platformConfigRepository.findOne({ where: { key } });

		if (config) {
			config.value = value;
			if (description) config.description = description;
		} else {
			config = this.platformConfigRepository.create({ key, value, description });
		}

		return this.platformConfigRepository.save(config);
	}
}
