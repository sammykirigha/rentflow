import { EncryptionService } from '@/common/services/encryption.service';
import { AbstractRepository } from '@/database/abstract.repository';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateAiModelDto } from './dto/create-ai-model.dto';
import { UpdateAiModelDto } from './dto/update-ai-model.dto';
import { AiModelConfiguration } from './entities/ai-model-configuration.entity';

@Injectable()
export class AiModelConfigurationRepository extends AbstractRepository<AiModelConfiguration> {
  constructor(
    @InjectRepository(AiModelConfiguration)
    repository: Repository<AiModelConfiguration>,
    private readonly encryptionService: EncryptionService,
  ) {
    super(repository);
  }

  async findActiveModels(): Promise<AiModelConfiguration[]> {
    return this.repository.find({
      where: { isActive: true },
      order: { isDefault: 'DESC', displayName: 'ASC' },
    });
  }

  async findAllModels(): Promise<AiModelConfiguration[]> {
    return this.repository.find({
      order: { isDefault: 'DESC', displayName: 'ASC' },
    });
  }

  async findDefaultModel(): Promise<AiModelConfiguration | null> {
    return this.repository.findOne({
      where: { isDefault: true, isActive: true },
    });
  }

  async setDefaultModel(id: string): Promise<void> {
    await this.repository.manager.transaction(async manager => {
      // Remove default from all models
      await manager.update(AiModelConfiguration, { isDefault: true }, { isDefault: false });
      // Set new default
      await manager.update(AiModelConfiguration, { id }, { isDefault: true });
    });
  }

  async createWithEncryptedKey(data: CreateAiModelDto): Promise<AiModelConfiguration> {
    const encryptedKey = data.apiKey
      ? await this.encryptionService.encrypt(data.apiKey)
      : null;

    const modelData = {
      ...data,
      apiKeyEncrypted: encryptedKey,
    };
    delete (modelData as any).apiKey;

    return this.create(modelData);
  }

  async updateWithEncryptedKey(id: string, data: UpdateAiModelDto): Promise<AiModelConfiguration | null> {
    const updateData = { ...data };

    if (data.apiKey) {
      (updateData as any).apiKeyEncrypted = await this.encryptionService.encrypt(data.apiKey);
      delete (updateData as any).apiKey;
    }

    return this.update({ modelId: id }, updateData);
  }

  async getDecryptedApiKey(id: string): Promise<string | null> {
    const model = await this.findOne({ where: { modelId: id } });
    if (!model?.apiKeyEncrypted) return null;

    try {
      return await this.encryptionService.decrypt(model.apiKeyEncrypted);
    } catch (error) {
      throw new Error('Failed to decrypt API key');
    }
  }

  async updateConnectionStatus(id: string, successful: boolean, errorMessage?: string): Promise<void> {
    await this.repository.update({ modelId: id }, {
      lastConnectionAt: new Date(),
      lastConnectionSuccessful: successful,
      lastConnectionError: successful ? null : errorMessage,
    });
  }

  async deleteModel(id: string): Promise<void> {
    const model = await this.findOne({ where: { modelId: id } });
    if (!model) {
      throw new NotFoundException('AI model not found');
    }

    if (model.isDefault) {
      throw new Error('Cannot delete the default AI model. Please set another model as default first.');
    }

    await this.delete(id);
  }

  async toggleModelStatus(id: string): Promise<AiModelConfiguration | null> {
    const model = await this.findOne({ where: { modelId: id } });
    if (!model) {
      throw new NotFoundException('AI model not found');
    }

    if (model.isDefault && model.isActive) {
      throw new Error('Cannot deactivate the default AI model. Please set another model as default first.');
    }

    return this.update({ modelId: id }, { isActive: !model.isActive });
  }

  async findByProvider(provider: string): Promise<AiModelConfiguration[]> {
    return this.repository.find({
      where: { provider: provider as any },
      order: { displayName: 'ASC' },
    });
  }

  async findByModelName(modelName: string): Promise<AiModelConfiguration | null> {
    return this.repository.findOne({
      where: { modelName },
    });
  }

  async countActiveModels(): Promise<number> {
    return this.repository.count({
      where: { isActive: true },
    });
  }

  async validateUniqueDefault(excludeId?: number): Promise<boolean> {
    const query = this.repository.createQueryBuilder('model')
      .where('model.isDefault = :isDefault', { isDefault: true });

    if (excludeId) {
      query.andWhere('model.id != :excludeId', { excludeId });
    }

    const count = await query.getCount();
    return count === 0;
  }
}