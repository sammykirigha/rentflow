import { RequireSuperAdmin } from '@/common/decorators/require-super-admin.decorator';
import { JwtPayload } from '@/common/interfaces/jwt-payload.interface';
import { OrganizationStatus } from '@/modules/organizations/entities/organization.entity';
import {
	Body,
	Controller,
	Get,
	Param,
	Patch,
	Post,
	Query,
	Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UpdateOrganizationDto } from '@/modules/organizations/dto/update-organization.dto';
import { CreateOrganizationWithOwnerDto } from './dto/create-organization-with-owner.dto';
import { PlatformService } from './platform.service';

@ApiTags('Platform')
@Controller('platform')
export class PlatformController {
	constructor(private readonly platformService: PlatformService) {}

	@Get('dashboard')
	@RequireSuperAdmin()
	async getDashboard() {
		return this.platformService.getDashboardStats();
	}

	@Get('organizations')
	@RequireSuperAdmin()
	async getOrganizations(
		@Query('page') page?: number,
		@Query('limit') limit?: number,
		@Query('status') status?: OrganizationStatus,
		@Query('search') search?: string,
	) {
		return this.platformService.getOrganizations(
			page || 1,
			limit || 20,
			status,
			search,
		);
	}

	@Post('organizations')
	@RequireSuperAdmin()
	async createOrganization(
		@Body() dto: CreateOrganizationWithOwnerDto,
		@Req() req: any,
	) {
		const user: JwtPayload = req.user;
		return this.platformService.createOrganizationWithOwner(dto, user.sub);
	}

	@Get('organizations/:id')
	@RequireSuperAdmin()
	async getOrganization(@Param('id') id: string) {
		return this.platformService.getOrganizationDetail(id);
	}

	@Patch('organizations/:id')
	@RequireSuperAdmin()
	async updateOrganization(
		@Param('id') id: string,
		@Body() dto: UpdateOrganizationDto,
		@Req() req: any,
	) {
		const user: JwtPayload = req.user;
		return this.platformService.updateOrganization(id, dto, user.sub);
	}

	@Post('organizations/:id/resend-invitation')
	@RequireSuperAdmin()
	async resendInvitation(@Param('id') id: string, @Req() req: any) {
		const user: JwtPayload = req.user;
		return this.platformService.resendInvitation(id, user.sub);
	}

	@Patch('organizations/:id/owner')
	@RequireSuperAdmin()
	async updateOrganizationOwner(
		@Param('id') id: string,
		@Body() body: { firstName?: string; lastName?: string; email?: string; phone?: string },
		@Req() req: any,
	) {
		const user: JwtPayload = req.user;
		return this.platformService.updateOrganizationOwner(id, body, user.sub);
	}

	@Patch('organizations/:id/suspend')
	@RequireSuperAdmin()
	async suspendOrganization(@Param('id') id: string, @Req() req: any) {
		const user: JwtPayload = req.user;
		return this.platformService.suspendOrganization(id, user.sub);
	}

	@Patch('organizations/:id/activate')
	@RequireSuperAdmin()
	async activateOrganization(@Param('id') id: string, @Req() req: any) {
		const user: JwtPayload = req.user;
		return this.platformService.activateOrganization(id, user.sub);
	}

	@Post('organizations/:id/impersonate')
	@RequireSuperAdmin()
	async impersonate(@Param('id') id: string, @Req() req: any) {
		const user: JwtPayload = req.user;
		const token = await this.platformService.createImpersonationToken(id, user.sub);
		return { accessToken: token };
	}

	@Get('config')
	@RequireSuperAdmin()
	async getConfig() {
		return this.platformService.getConfig();
	}

	@Patch('config')
	@RequireSuperAdmin()
	async updateConfig(@Body() body: { key: string; value: string; description?: string }) {
		return this.platformService.updateConfig(body.key, body.value, body.description);
	}
}
