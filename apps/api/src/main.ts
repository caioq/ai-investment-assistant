// Must run before any other import touches `process.env` (JwtStrategy,
// the Anthropic client provider, etc. all read it at construction time —
// see CONVENTIONS.md -> "Auth"). Quietly does nothing if `apps/api/.env`
// doesn't exist (CI/prod set real env vars directly) and never overrides
// a variable already present in the environment.
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './configure-app';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
