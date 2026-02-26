import { CanActivate, ExecutionContext, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class MpesaIpGuard implements CanActivate {
	private readonly logger = new Logger(MpesaIpGuard.name);

	// Safaricom known IP ranges
	private readonly productionCidrs = ['196.201.214.0/24', '196.201.215.0/24'];
	private readonly sandboxCidrs = ['196.201.214.0/24'];
	private readonly localIps = ['127.0.0.1', '::1', '::ffff:127.0.0.1'];

	constructor(private readonly configService: ConfigService) {}

	canActivate(context: ExecutionContext): boolean {
		const request = context.switchToHttp().getRequest<Request>();
		const clientIp = this.extractClientIp(request);
		const environment = this.configService.get<string>('MPESA_ENVIRONMENT', 'sandbox');

		if (environment === 'sandbox') {
			// In sandbox, allow local IPs and Safaricom ranges
			if (this.localIps.includes(clientIp)) {
				return true;
			}
			for (const cidr of this.sandboxCidrs) {
				if (this.isIpInCidr(clientIp, cidr)) {
					return true;
				}
			}
			// In sandbox, be more permissive to allow testing
			this.logger.warn(`Sandbox: allowing request from IP ${clientIp}`);
			return true;
		}

		// Production: only allow Safaricom IP ranges
		for (const cidr of this.productionCidrs) {
			if (this.isIpInCidr(clientIp, cidr)) {
				return true;
			}
		}

		this.logger.warn(`Rejected M-Pesa callback from unauthorized IP: ${clientIp}`);
		throw new ForbiddenException('Unauthorized');
	}

	private extractClientIp(request: Request): string {
		const forwarded = request.headers['x-forwarded-for'];
		if (forwarded) {
			const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
			return ip.trim();
		}
		return request.ip || request.socket.remoteAddress || '';
	}

	private isIpInCidr(ip: string, cidr: string): boolean {
		// Strip IPv6 mapped prefix
		const cleanIp = ip.startsWith('::ffff:') ? ip.slice(7) : ip;

		const [range, bits] = cidr.split('/');
		const maskBits = parseInt(bits, 10);
		const mask = maskBits === 0 ? 0 : (~0 << (32 - maskBits)) >>> 0;

		const ipNum = this.ipToNumber(cleanIp);
		const rangeNum = this.ipToNumber(range);

		if (ipNum === null || rangeNum === null) {
			return false;
		}

		return (ipNum & mask) === (rangeNum & mask);
	}

	private ipToNumber(ip: string): number | null {
		const parts = ip.split('.');
		if (parts.length !== 4) return null;

		let num = 0;
		for (const part of parts) {
			const octet = parseInt(part, 10);
			if (isNaN(octet) || octet < 0 || octet > 255) return null;
			num = (num << 8) + octet;
		}
		return num >>> 0;
	}
}
