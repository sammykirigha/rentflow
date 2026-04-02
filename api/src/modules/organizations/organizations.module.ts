import { EncryptionService } from '@/common/services/encryption.service';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from './entities/organization.entity';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsRepository } from './organizations.repository';
import { OrganizationsService } from './organizations.service';

@Module({
	imports: [TypeOrmModule.forFeature([Organization])],
	controllers: [OrganizationsController],
	providers: [OrganizationsService, OrganizationsRepository, EncryptionService],
	exports: [OrganizationsService, OrganizationsRepository],
})
export class OrganizationsModule {}
