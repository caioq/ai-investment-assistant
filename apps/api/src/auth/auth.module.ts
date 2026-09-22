import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';

/** Defaults per the auth spec's "Amended by auth-ui" note. */
const DEFAULT_AUTH_THROTTLE_LIMIT = 5;
const DEFAULT_AUTH_THROTTLE_TTL_MS = 60_000;

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
 *
 * `ThrottlerModule` backs the per-IP limit on `POST /auth/login` and
 * `POST /auth/register` (AUTH_UI_SHARED_T-5). Its `ThrottlerGuard` is applied
 * on those two routes only, never globally. `forRootAsync` reads the env at
 * module init rather than at import time, so a test can set the variables
 * after importing `AppModule` but before `createTestingModule`.
 */
@Module({
  imports: [
    PassportModule,
    JwtModule.register({ secret: process.env.JWT_SECRET }),
    ThrottlerModule.forRootAsync({
      useFactory: () => [
        {
          limit: Number(process.env.AUTH_THROTTLE_LIMIT ?? DEFAULT_AUTH_THROTTLE_LIMIT),
          ttl: Number(process.env.AUTH_THROTTLE_TTL_MS ?? DEFAULT_AUTH_THROTTLE_TTL_MS),
        },
      ],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
