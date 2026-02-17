import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { JwtPayload } from '@/common/interfaces/jwt-payload.interface';
import { Body, Controller, Get, HttpCode, HttpStatus, Ip, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { UsersService } from '../users/users.service';
import { UpdateSystemSettingsDto } from './dto/update-system-settings.dto';
import { SettingsService } from './settings.service';

@ApiTags('Settings')
@Controller('settings')
@ApiSecurity('bearer')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly usersService: UsersService,
  ) { }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get system settings' })
  @ApiResponse({ status: 200, description: 'System settings retrieved successfully' })
  async getSettings() {
    return await this.settingsService.getSettings();
  }

  @Patch()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update system settings (Landlord only)' })
  @ApiResponse({ status: 200, description: 'System settings updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async updateSettings(
    @Body() updateDto: UpdateSystemSettingsDto,
    @CurrentUser() user: JwtPayload,
    @Ip() ipAddress: string,
  ) {
    const admin = await this.usersService.findOne(user.sub);
    return await this.settingsService.updateSettings(
      updateDto,
      user.sub,
      admin.fullName,
      ipAddress,
    );
  }
}
