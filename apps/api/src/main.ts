import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
// `cookie-parser` uses `export =`; namespace import matches the `bcrypt`
// import in `auth.service.ts` since the repo's api tsconfig doesn't set
// `esModuleInterop`.
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
  // Populates `req.cookies` so `JwtStrategy`'s cookie extractor
  // (`apps/api/src/auth/jwt.strategy.ts`) can read the `access_token` cookie.
  app.use(cookieParser());
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
