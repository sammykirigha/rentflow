import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { JwtPayload } from '@/common/interfaces/jwt-payload.interface';
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Ip, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { UsersService } from '../users/users.service';
import { AiModelConfigurationService } from './ai-model-configuration.service';
import { CreateAiModelDto } from './dto/create-ai-model.dto';
import { UpdateAiModelDto } from './dto/update-ai-model.dto';
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
    private readonly aiModelService: AiModelConfigurationService,
    private readonly usersService: UsersService,
  ) { }

  // System Settings Endpoints
  @Get()
  @Public()
  @ApiOperation({ summary: 'Get system settings' })
  @ApiResponse({ status: 200, description: 'System settings retrieved successfully' })
  async getSettings() {
    return await this.settingsService.getSettings();
  }

  @Patch()
  @HttpCode(HttpStatus.OK)
  // @RequirePermissions(Permission(PermissionResource.SETTINGS, PermissionAction.UPDATE))
  @ApiOperation({ summary: 'Update system settings (Admin only)' })
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

  // AI Model Configuration Endpoints
  @Get('ai-models')
  // @RequirePermissions(Permission(PermissionResource.AI_MODELS, PermissionAction.READ))
  @ApiOperation({ summary: 'Get all AI model configurations' })
  @ApiResponse({ status: 200, description: 'AI models retrieved successfully' })
  async getAiModels() {
    return await this.aiModelService.getAllModels();
  }

  @Get('ai-models/active')
  @Public()
  @ApiOperation({ summary: 'Get active AI model configurations' })
  @ApiResponse({ status: 200, description: 'Active AI models retrieved successfully' })
  async getActiveAiModels() {
    return await this.aiModelService.getActiveModels();
  }

  @Get('ai-models/default')
  @Public()
  @ApiOperation({ summary: 'Get default AI model configuration' })
  @ApiResponse({ status: 200, description: 'Default AI model retrieved successfully' })
  async getDefaultAiModel() {
    return await this.aiModelService.getDefaultModel();
  }

  @Get('ai-models/:id')
  // @RequirePermissions(Permission(PermissionResource.AI_MODELS, PermissionAction.READ))
  @ApiOperation({ summary: 'Get AI model configuration by ID' })
  @ApiResponse({ status: 200, description: 'AI model retrieved successfully' })
  @ApiResponse({ status: 404, description: 'AI model not found' })
  async getAiModelById(@Param('id') id: string) {
    return await this.aiModelService.getModelById(id);
  }

  @Post('ai-models')
  // @RequirePermissions(Permission(PermissionResource.AI_MODELS, PermissionAction.CREATE))
  @ApiOperation({ summary: 'Create new AI model configuration' })
  @ApiResponse({ status: 201, description: 'AI model created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async createAiModel(
    @Body() createDto: CreateAiModelDto,
    @CurrentUser() user: JwtPayload,
    @Ip() ipAddress: string,
  ) {
    const admin = await this.usersService.findOne(user.sub);
    return await this.aiModelService.createModel(createDto, user.sub, admin.fullName, ipAddress);
  }

  @Patch('ai-models/:id')
  // @RequirePermissions(Permission(PermissionResource.AI_MODELS, PermissionAction.UPDATE))
  @ApiOperation({ summary: 'Update AI model configuration' })
  @ApiResponse({ status: 200, description: 'AI model updated successfully' })
  @ApiResponse({ status: 404, description: 'AI model not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async updateAiModel(
    @Param('id') id: string,
    @Body() updateDto: UpdateAiModelDto,
    @CurrentUser() user: JwtPayload,
    @Ip() ipAddress: string,
  ) {
    const admin = await this.usersService.findOne(user.sub);
    return await this.aiModelService.updateModel(id, updateDto, user.sub, admin.fullName, ipAddress);
  }

  @Delete('ai-models/:id')
  // @RequirePermissions(Permission(PermissionResource.AI_MODELS, PermissionAction.DELETE))
  @ApiOperation({ summary: 'Delete AI model configuration' })
  @ApiResponse({ status: 200, description: 'AI model deleted successfully' })
  @ApiResponse({ status: 404, description: 'AI model not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async deleteAiModel(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Ip() ipAddress: string,
  ) {
    const admin = await this.usersService.findOne(user.sub);
    await this.aiModelService.deleteModel(id, user.sub, admin.fullName, ipAddress);
    return { success: true, message: 'AI model deleted successfully' };
  }

  @Post('ai-models/:id/set-default')
  // @RequirePermissions(Permission(PermissionResource.AI_MODELS, PermissionAction.UPDATE))
  @ApiOperation({ summary: 'Set default AI model' })
  @ApiResponse({ status: 200, description: 'Default AI model updated successfully' })
  @ApiResponse({ status: 404, description: 'AI model not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async setDefaultAiModel(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Ip() ipAddress: string,
  ) {
    const admin = await this.usersService.findOne(user.sub);
    await this.aiModelService.setDefaultModel(id, user.sub, admin.fullName, ipAddress);
    return { success: true, message: 'Default AI model updated successfully' };
  }

  @Post('ai-models/:id/toggle-status')
  // @RequirePermissions(Permission(PermissionResource.AI_MODELS, PermissionAction.UPDATE))
  @ApiOperation({ summary: 'Toggle AI model active status' })
  @ApiResponse({ status: 200, description: 'AI model status updated successfully' })
  @ApiResponse({ status: 404, description: 'AI model not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async toggleAiModelStatus(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Ip() ipAddress: string,
  ) {
    const admin = await this.usersService.findOne(user.sub);
    const updatedModel = await this.aiModelService.toggleModelStatus(id, user.sub, admin.fullName, ipAddress);
    return { success: true, data: updatedModel, message: 'AI model status updated successfully' };
  }

  @Post('ai-models/:id/test-connection')
  // @RequirePermissions(Permission(PermissionResource.AI_MODELS, PermissionAction.READ))
  @ApiOperation({ summary: 'Test AI model connection' })
  @ApiResponse({ status: 200, description: 'Connection test completed' })
  @ApiResponse({ status: 404, description: 'AI model not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async testAiModelConnection(
    @Param('id',) id: string,
    @CurrentUser() user: JwtPayload,
    @Ip() ipAddress: string,
  ) {
    const admin = await this.usersService.findOne(user.sub);
    const isConnected = await this.aiModelService.testModelConnection(id, user.sub, admin.fullName, ipAddress);
    return {
      success: isConnected,
      message: isConnected ? 'Connection successful' : 'Connection failed'
    };
  }

  @Get('ai-models/:id/api-key')
  // @RequirePermissions(Permission(PermissionResource.AI_MODELS, PermissionAction.VIEW_SENSITIVE))
  @ApiOperation({ summary: 'Get decrypted API key (requires special permission)' })
  @ApiResponse({ status: 200, description: 'API key retrieved successfully' })
  @ApiResponse({ status: 404, description: 'AI model not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async getAiModelApiKey(
    @Param('id',) id: string,
    @CurrentUser() user: JwtPayload,
    @Ip() ipAddress: string,
  ) {
    const apiKey = await this.aiModelService.getDecryptedApiKey(id);
    return { apiKey };
  }
}
