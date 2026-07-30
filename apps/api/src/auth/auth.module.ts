import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

/**
 * `PrismaService` is available here via constructor DI without importing
 * `PrismaModule` (it's `@Global()` — see CONVENTIONS.md -> "Module structure").
 */
@Module({
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
