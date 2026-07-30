import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

/**
 * `PrismaService` is available here via constructor DI without importing
 * `PrismaModule` (it's `@Global()` — see CONVENTIONS.md -> "Module structure").
 *
 * `JwtModule` is configured with `JWT_SECRET` (see `.env.example`) so
 * `AuthService.issueSession` can sign the `access_token` cookie's JWT.
 */
@Module({
  imports: [JwtModule.register({ secret: process.env.JWT_SECRET })],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
