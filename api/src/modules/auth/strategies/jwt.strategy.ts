import { UserStatus } from '@/common/enums/user-status.enum';
import { JwtPayload } from '@/common/interfaces/jwt-payload.interface';
import authConfig from '@/config/auth.config';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: authConfig.jwtSecret,
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload & { permissions: string[]; }> {
    const user = await this.usersService.findOne(payload.sub);

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Extract permissions from role
    const permissions = user.permissions || [];

    return {
      sub: user.userId,
      email: user.email,
      role: user.roleId,
      permissions,
      isAdminUser: user.userRole?.isAdminRole
    };
  }
}