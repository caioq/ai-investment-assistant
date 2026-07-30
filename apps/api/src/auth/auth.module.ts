import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';

/**
 * `PrismaService` is available here via constructor DI without importing
 * `PrismaModule` (it's `@Global()` — see CONVENTIONS.md -> "Module structure").
 *
 * `JwtModule` is configured with `JWT_SECRET` (see `.env.example`) so
 * `AuthService.issueSession` can sign the `access_token` cookie's JWT.
 *
 * `PassportModule` + `JwtStrategy` register the `'jwt'` strategy that
 * `AuthGuard` (`auth.guard.ts`) activates on every protected controller,
 * per CONVENTIONS.md -> "Auth".
 */
@Module({
  imports: [PassportModule, JwtModule.register({ secret: process.env.JWT_SECRET })],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
