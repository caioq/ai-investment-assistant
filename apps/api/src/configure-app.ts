import { INestApplication, ValidationPipe } from '@nestjs/common';
// `cookie-parser` uses `export =`; namespace import matches the `bcrypt`
// import in `auth.service.ts` since the repo's api tsconfig doesn't set
// `esModuleInterop`.
import * as cookieParser from 'cookie-parser';

/**
 * Cross-cutting app configuration shared by the real bootstrap (main.ts) and
 * e2e tests, so tests exercise the exact same setup that runs in production
 * without importing main.ts itself (which has a top-level `bootstrap()` call
 * that would start a real listening server as a side effect of the import).
 */
export function configureApp(app: INestApplication) {
  // Populates `req.cookies` so `JwtStrategy`'s cookie extractor
  // (`apps/api/src/auth/jwt.strategy.ts`) can read the `access_token` cookie.
  app.use(cookieParser());
  app.enableCors({ origin: process.env.FRONTEND_URL, credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
}
