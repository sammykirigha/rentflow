import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { AuthService } from './auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { GoogleAuthDto, ConnectGoogleDto } from './dto/google-auth.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SetPasswordDto } from './dto/set-password.dto';

@Controller('auth')
@UseInterceptors(ClassSerializerInterceptor)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('refresh')
  @UseGuards(AuthGuard('jwt-refresh'))
  async refresh(@CurrentUser() user: JwtPayload) {
    return this.authService.refreshToken(user);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  async getCurrentUser(@CurrentUser() user: JwtPayload) {
    return this.authService.getCurrentUser(user.sub);
  }

  @Post('forgot-password')
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  // Google OAuth endpoints
  @Post('oauth/google')
  async handleGoogleAuth(@Body() googleAuthDto: GoogleAuthDto) {
    return this.authService.authenticateWithGoogle(googleAuthDto);
  }

  @Post('google/connect')
  @UseGuards(AuthGuard('jwt'))
  async connectGoogleAccount(
    @CurrentUser() user: JwtPayload,
    @Body() connectGoogleDto: ConnectGoogleDto
  ) {
    return this.authService.connectGoogleAccount(user.sub, connectGoogleDto);
  }

  @Delete('google/disconnect')
  @UseGuards(AuthGuard('jwt'))
  async disconnectGoogleAccount(@CurrentUser() user: JwtPayload) {
    return this.authService.disconnectGoogleAccount(user.sub);
  }

  @Post('set-password')
  @UseGuards(AuthGuard('jwt'))
  async setPassword(
    @CurrentUser() user: JwtPayload,
    @Body() setPasswordDto: SetPasswordDto
  ) {
    return this.authService.setPassword(user.sub, setPasswordDto.newPassword);
  }

  @Get('status')
  @UseGuards(AuthGuard('jwt'))
  async getAuthStatus(@CurrentUser() user: JwtPayload) {
    return this.authService.getAuthStatus(user.sub);
  }
}