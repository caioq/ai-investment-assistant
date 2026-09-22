import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Per-IP throttling on `POST /auth/login` and `POST /auth/register`
 * (AUTH_UI_SHARED_T-5, auth spec -> "Amended by auth-ui").
 *
 * The limit is pinned to the production default here. Every other e2e suite
 * runs with `AUTH_THROTTLE_LIMIT=1000` (CI job env / CONVENTIONS.md ->
 * "Testing"); Jest runs each e2e file in its own worker, so setting
 * `process.env` in this file doesn't leak into them.
 */
const LIMIT = 5;

// Namespaced to this suite so a parallel suite's scoped cleanup can't
// collide with it (CONVENTIONS.md -> "Testing").
const REGISTER_EMAILS = Array.from(
  { length: LIMIT + 1 },
  (_, i) => `auth-throttle-register-${i}@example.com`,
);

async function createApp(): Promise<{ app: INestApplication; moduleFixture: TestingModule }> {
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  configureApp(app);
  await app.init();

  return { app, moduleFixture };
}

describe('Auth throttling (e2e)', () => {
  const originalLimit = process.env.AUTH_THROTTLE_LIMIT;
  const originalTtl = process.env.AUTH_THROTTLE_TTL_MS;

  beforeAll(() => {
    process.env.AUTH_THROTTLE_LIMIT = String(LIMIT);
    process.env.AUTH_THROTTLE_TTL_MS = '60000';
  });

  afterAll(() => {
    if (originalLimit === undefined) delete process.env.AUTH_THROTTLE_LIMIT;
    else process.env.AUTH_THROTTLE_LIMIT = originalLimit;
    if (originalTtl === undefined) delete process.env.AUTH_THROTTLE_TTL_MS;
    else process.env.AUTH_THROTTLE_TTL_MS = originalTtl;
  });

  describe('POST /auth/login', () => {
    let app: INestApplication;

    beforeAll(async () => {
      ({ app } = await createApp());
    });

    afterAll(async () => {
      await app.close();
    });

    it(`returns 401 for the first ${LIMIT} wrong-credential attempts and 429 on the next`, async () => {
      for (let i = 0; i < LIMIT; i++) {
        await request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: 'auth-throttle-nobody@example.com', password: 'wrong-password' })
          .expect(401);
      }

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'auth-throttle-nobody@example.com', password: 'wrong-password' })
        .expect(429);
    });

    it('leaves GET /auth/me unthrottled after the login limit is hit', async () => {
      await request(app.getHttpServer()).get('/auth/me').expect(401);
    });
  });

  describe('POST /auth/register', () => {
    let app: INestApplication;
    let prisma: PrismaService;

    beforeAll(async () => {
      // A fresh app instance: the in-memory throttler storage from the
      // login block above is not shared with it.
      const created = await createApp();
      app = created.app;
      prisma = created.moduleFixture.get(PrismaService);
      await prisma.user.deleteMany({ where: { email: { in: REGISTER_EMAILS } } });
    });

    afterAll(async () => {
      await prisma.user.deleteMany({ where: { email: { in: REGISTER_EMAILS } } });
      await app.close();
    });

    it(`returns 429 on the ${LIMIT + 1}th registration from the same IP`, async () => {
      for (let i = 0; i < LIMIT; i++) {
        await request(app.getHttpServer())
          .post('/auth/register')
          .send({ email: REGISTER_EMAILS[i], password: 'super-secret-password', name: 'Throttle' })
          .expect(201);
      }

      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: REGISTER_EMAILS[LIMIT],
          password: 'super-secret-password',
          name: 'Throttle',
        })
        .expect(429);

      const created = await prisma.user.count({ where: { email: REGISTER_EMAILS[LIMIT] } });
      expect(created).toBe(0);
    });
  });
});
