import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthGuard } from './auth.guard';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthService } from './auth.service';

/**
 * Remaining routes (`/auth/logout`) are added incrementally by later tasks
 * (see specs/auth/tasks/ AUTH_US-3 onward), reusing `AuthService.issueSession`
 * added here.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
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
}
