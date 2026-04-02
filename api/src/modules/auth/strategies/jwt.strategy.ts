import { UserStatus } from '@/common/enums/user-status.enum';
import { UserRole } from '@/common/enums/user-role.enum';
import { JwtPayload } from '@/common/interfaces/jwt-payload.interface';
import authConfig from '@/config/auth.config';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';

/**
 * JwtStrategy must remain a singleton (Passport requirement).
 * We inject the raw TypeORM Repository<User> instead of UsersService
 * because UsersService → UsersRepository → OrgContextService (REQUEST-scoped)
 * would make this strategy REQUEST-scoped, breaking Passport registration.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: authConfig.jwtSecret,
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload & { permissions: string[]; }> {
    const user = await this.userRepository.findOne({
      where: { userId: payload.sub },
      relations: { userRole: { permissions: true } },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Extract permissions from role
    const permissions = user.permissions || [];

    const isSuperAdmin = user.userRole?.name === UserRole.SUPER_ADMIN;

    return {
      sub: user.userId,
      email: user.email,
      role: user.roleId,
      roleName: user.userRole?.name,
      organizationId: payload.organizationId || user.organizationId,
      isSuperAdmin,
      impersonatedBy: payload.impersonatedBy,
      mustChangePassword: user.mustChangePassword || false,
      permissions,
      isAdminUser: user.userRole?.isAdminRole,
    };
  }
}