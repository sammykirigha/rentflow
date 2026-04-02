import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { JwtPayload } from '@/common/interfaces/jwt-payload.interface';
import {
	Body,
	Controller,
	Get,
	Param,
	Patch,
	UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@ApiTags('Organizations')
@Controller('organizations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OrganizationsController {
	constructor(private readonly organizationsService: OrganizationsService) {}

	@Get('current')
	async getCurrentOrganization(@CurrentUser() user: JwtPayload) {
		if (!user.organizationId) {
			return null;
		}
		return this.organizationsService.findOne(user.organizationId);
	}

	@Patch('current')
	async updateCurrentOrganization(
		@CurrentUser() user: JwtPayload,
		@Body() dto: UpdateOrganizationDto,
	) {
		if (!user.organizationId) {
			return null;
		}
		return this.organizationsService.update(user.organizationId, dto);
	}

	@Get('current/credentials')
	async getCurrentOrgCredentials(@CurrentUser() user: JwtPayload) {
		if (!user.organizationId) {
			return null;
		}
		return this.organizationsService.getCredentialStatus(user.organizationId);
	}

	@Patch(':id')
	async update(
		@Param('id') id: string,
		@Body() dto: UpdateOrganizationDto,
	) {
		return this.organizationsService.update(id, dto);
	}
}
