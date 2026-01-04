import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Article } from '../articles/entities/article.entity';
import { AuditModule } from '../audit/audit.module';
import { Keyword } from '../keywords/entities/keyword.entity';
import { Role } from '../permissions/entities/role.entity';
import { PermissionsModule } from '../permissions/permissions.module';
import { User } from './entities/user.entity';
import { UsersController } from './users.controller';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Role,
      Keyword,
      Article
    ]),
    AuditModule,
    forwardRef(() => PermissionsModule)
  ],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService, UsersRepository],
})
export class UsersModule {}