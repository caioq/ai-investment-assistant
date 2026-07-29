import { INestApplication } from '@nestjs/common';

/**
 * Cross-cutting app configuration shared by the real bootstrap (main.ts) and
 * e2e tests, so tests exercise the exact same setup that runs in production
 * without importing main.ts itself (which has a top-level `bootstrap()` call
 * that would start a real listening server as a side effect of the import).
 */
export function configureApp(app: INestApplication) {
  app.enableCors({ origin: process.env.FRONTEND_URL, credentials: true });
}
