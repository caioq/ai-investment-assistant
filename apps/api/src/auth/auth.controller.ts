import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthGuard } from './auth.guard';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Per-IP throttling on the two unauthenticated endpoints only
  // (AUTH_UI_SHARED_T-5); limits come from ThrottlerModule in auth.module.ts.
  @Post('register')
  @UseGuards(ThrottlerGuard)
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ id: string; email: string; name: string | null }> {
    const user = await this.authService.register(dto.email, dto.password, dto.name);

    this.authService.issueSession(res, user);

    return { id: user.id, email: user.email, name: user.name };
  }

  @Post('login')
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ id: string; email: string; name: string | null }> {
    const user = await this.authService.validateUser(dto.email, dto.password);

    this.authService.issueSession(res, user);

    return { id: user.id, email: user.email, name: user.name };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async me(@Req() req: Request): Promise<{ id: string; email: string; name: string | null }> {
    const user = await this.authService.findById((req.user as { id: string }).id);

    return { id: user.id, email: user.email, name: user.name };
  }

  @Post('logout')
  @HttpCode(204)
  @UseGuards(AuthGuard)
  logout(@Res({ passthrough: true }) res: Response): void {
    this.authService.clearSession(res);
  }
}
