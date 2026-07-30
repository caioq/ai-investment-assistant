import { Body, Controller, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { RegisterDto } from './dto/register.dto';
import { AuthService } from './auth.service';

/**
 * Remaining routes (`/auth/login`, `/auth/logout`, `/auth/me`) are added
 * incrementally by later tasks (see specs/auth/tasks/ AUTH_US-2_T-2 and
 * onward), reusing `AuthService.issueSession` added here.
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
}
