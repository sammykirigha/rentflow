import { UserStatus } from '@/common/enums/user-status.enum';
import authConfig from '@/config/auth.config';
import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { MailService } from '../mail/mail.service';
import { UsersService } from '../users/users.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
	constructor(
		private readonly usersService: UsersService,
		private readonly jwtService: JwtService,
		private readonly configService: ConfigService,
		private readonly mailService: MailService,
	) { }

	async login(loginDto: LoginDto): Promise<AuthResponseDto> {
		const { email, password } = loginDto;

		const user = await this.usersService.findByEmail(email);
		if (!user) {
			throw new UnauthorizedException('Invalid credentials');
		}

		if (!user.password) {
			throw new UnauthorizedException('No password set for this account.');
		}

		const isPasswordValid = await this.validatePassword(password, user.password);
		if (!isPasswordValid) {
			throw new UnauthorizedException('Invalid credentials');
		}

		if (user.status !== UserStatus.ACTIVE) {
			throw new UnauthorizedException('Account is not active. Please contact support.');
		}

		const payload: JwtPayload = {
			sub: user.userId,
			email: user.email,
			role: user.roleId,
			isAdminUser: user.userRole?.isAdminRole
		};

		const accessToken = this.generateAccessToken(payload);
		const refreshToken = this.generateRefreshToken(payload);

		await this.updateLastLogin(user.userId);

		return {
			user,
			accessToken,
			refreshToken,
		};
	}

	async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
		const userData = {
			...registerDto,
			role: UserRole.TENANT,
		};

		const user = await this.usersService.create(userData);

		const payload: JwtPayload = {
			sub: user.userId,
			email: user.email,
			role: user.roleId,
			isAdminUser: user.userRole?.isAdminRole
		};

		const accessToken = this.generateAccessToken(payload);
		const refreshToken = this.generateRefreshToken(payload);

		return {
			user,
			accessToken,
			refreshToken,
		};
	}

	async refreshToken(user: JwtPayload): Promise<{ accessToken: string; }> {
		const payload: JwtPayload = {
			sub: user.sub,
			email: user.email,
			role: user.role,
		};

		const accessToken = this.generateAccessToken(payload);

		return { accessToken };
	}

	private generateAccessToken(payload: JwtPayload): string {
		return this.jwtService.sign(payload, {
			secret: authConfig.jwtSecret,
			expiresIn: authConfig.jwtExpiresIn,
		});
	}

	private generateRefreshToken(payload: JwtPayload): string {
		return this.jwtService.sign(payload, {
			secret: authConfig.jwtRefreshSecret,
			expiresIn: authConfig.jwtRefreshExpiresIn,
		});
	}

	async validatePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
		return bcrypt.compare(plainPassword, hashedPassword);
	}

	async getCurrentUser(id: string) {
		const user = await this.usersService.findOneWithTenant(id);

		// Manually structure the tenant data to avoid circular reference
		// (Tenant eagerly loads User, causing User→Tenant→User loop that
		// breaks ClassSerializerInterceptor's deep serialization)
		const { tenant, password, refreshToken, ...userData } = user as any;
		const result: any = { ...userData };

		if (tenant) {
			const { user: _tenantUser, unit, ...tenantData } = tenant;
			result.tenant = { ...tenantData };
			if (unit) {
				const { tenant: _unitTenant, ...unitData } = unit;
				result.tenant.unit = unitData;
			}
		}

		return result;
	}

	async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string; }> {
		const { email } = forgotPasswordDto;

		const user = await this.usersService.findByEmail(email);
		if (!user) {
			return { message: 'If an account with that email exists, a password reset link has been sent.' };
		}
		if (user.status !== UserStatus.ACTIVE) {
			throw new BadRequestException('Account is not active. Please contact support.');
		}

		const resetToken = crypto.randomBytes(32).toString('hex');
		const resetTokenExpires = new Date(Date.now() + 15 * 60 * 1000);

		await this.usersService.updateResetToken(user.userId, resetToken, resetTokenExpires);

		const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
		const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

		const emailHtml = `
			<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
				<h2 style="color: #333;">Password Reset Request</h2>
				<p>Hello ${user.firstName || 'User'},</p>
				<p>You requested a password reset for your RentFlow account. Click the button below to reset your password:</p>
				<div style="text-align: center; margin: 30px 0;">
					<a href="${resetUrl}" style="background-color: #1890ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Password</a>
				</div>
				<p>Or copy and paste this link into your browser:</p>
				<p style="word-break: break-all; color: #666;">${resetUrl}</p>
				<p><strong>This link will expire in 15 minutes.</strong></p>
				<p>If you didn't request this password reset, please ignore this email.</p>
				<hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
				<p style="color: #666; font-size: 12px;">This is an automated message from RentFlow, please do not reply.</p>
			</div>
		`;

		await this.mailService.sendEmail({
			to: user.email,
			subject: 'RentFlow - Password Reset Request',
			html: emailHtml,
		});

		return { message: 'If an account with that email exists, a password reset link has been sent.' };
	}

	async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{ message: string; }> {
		const { token, newPassword } = resetPasswordDto;

		const user = await this.usersService.findByResetToken(token);
		if (!user) {
			throw new BadRequestException('Invalid or expired reset token');
		}

		await this.usersService.updatePassword(user.userId, newPassword);
		await this.usersService.clearResetToken(user.userId);

		const emailHtml = `
			<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
				<h2 style="color: #333;">Password Reset Successful</h2>
				<p>Hello ${user.firstName || 'User'},</p>
				<p>Your RentFlow password has been successfully reset.</p>
				<p>If you didn't make this change, please contact our support team immediately.</p>
				<hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
				<p style="color: #666; font-size: 12px;">This is an automated message from RentFlow, please do not reply.</p>
			</div>
		`;

		await this.mailService.sendEmail({
			to: user.email,
			subject: 'RentFlow - Password Reset Successful',
			html: emailHtml,
		});

		return { message: 'Password has been reset successfully' };
	}

	async updateLastLogin(userId: string): Promise<void> {
		await this.usersService.updateLastLogin(userId);
	}
}
