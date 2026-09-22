import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { PrismaService } from '../src/prisma/prisma.service';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;
  let prisma: PrismaService;

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = moduleFixture.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  // Scoped to the emails this suite registers, rather than an unscoped
  // `deleteMany()` — jest e2e suites run in parallel workers against the same
  // test Postgres (CONVENTIONS.md -> "Testing"). An unscoped delete here wipes
  // every user in the database mid-run, including ones another suite has just
  // registered, so that suite's next write fails a foreign key and 500s. This
  // suite predates that convention and was the source of a ~50%-reproducible
  // flake in `portfolio.e2e-spec.ts`.
  afterEach(async () => {
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            'jane@example.com',
            'dupe@example.com',
            'me@example.com',
            'logout@example.com',
            'wrongpass@example.com',
            'never-registered@example.com',
            'auth-e2e-no-name@example.com',
            'auth-e2e-blank-name@example.com',
            'auth-e2e-trimmed-name@example.com',
          ],
        },
      },
    });
  });

  describe('POST /auth/register', () => {
    it('registers a new user, sets the access_token cookie, and returns only public fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'jane@example.com', password: 'super-secret-password', name: 'Jane Doe' })
        .expect((res) => {
          if (res.status !== 200 && res.status !== 201) {
            throw new Error(`expected 200 or 201, got ${res.status}`);
          }
        });

      const setCookieHeader = response.headers['set-cookie'];
      expect(setCookieHeader).toBeDefined();
      expect(
        (Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader]).some(
          (cookie: string) => cookie.startsWith('access_token='),
        ),
      ).toBe(true);

      expect(response.body).toEqual({
        id: expect.any(String),
        email: 'jane@example.com',
        name: 'Jane Doe',
      });
      expect(response.body.passwordHash).toBeUndefined();
    });

    it('returns a 4xx (not 500, no duplicate row) when the email is already registered', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'dupe@example.com',
          password: 'super-secret-password',
          name: 'Auth E2E Dupe',
        })
        .expect((res) => {
          if (res.status !== 200 && res.status !== 201) {
            throw new Error(`expected 200 or 201, got ${res.status}`);
          }
        });

      const secondResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'dupe@example.com', password: 'another-password', name: 'Auth E2E Dupe' });

      expect(secondResponse.status).toBeGreaterThanOrEqual(400);
      expect(secondResponse.status).toBeLessThan(500);

      const users = await prisma.user.findMany({ where: { email: 'dupe@example.com' } });
      expect(users).toHaveLength(1);
    });

    // `name` is required and trimmed (specs/auth/spec.md -> "Amended by
    // auth-ui", AUTH_UI_US-2_T-1).
    it('returns 400 and creates no user when name is missing', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'auth-e2e-no-name@example.com', password: 'super-secret-password' });

      expect(response.status).toBe(400);

      const users = await prisma.user.findMany({
        where: { email: 'auth-e2e-no-name@example.com' },
      });
      expect(users).toHaveLength(0);
    });

    it('returns 400 and creates no user when name is whitespace only', async () => {
      const response = await request(app.getHttpServer()).post('/auth/register').send({
        email: 'auth-e2e-blank-name@example.com',
        password: 'super-secret-password',
        name: '   ',
      });

      expect(response.status).toBe(400);

      const users = await prisma.user.findMany({
        where: { email: 'auth-e2e-blank-name@example.com' },
      });
      expect(users).toHaveLength(0);
    });

    it('stores and returns the trimmed name, also via GET /auth/me', async () => {
      const response = await request(app.getHttpServer()).post('/auth/register').send({
        email: 'auth-e2e-trimmed-name@example.com',
        password: 'super-secret-password',
        name: '  Ana  ',
      });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('Ana');

      const setCookieHeader = response.headers['set-cookie'];
      const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];

      const meResponse = await request(app.getHttpServer()).get('/auth/me').set('Cookie', cookies);

      expect(meResponse.status).toBe(200);
      expect(meResponse.body.name).toBe('Ana');
    });
  });

  describe('POST /auth/login', () => {
    it('logs in with the correct credentials, sets the access_token cookie, and returns only public fields', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'jane@example.com', password: 'super-secret-password', name: 'Jane Doe' })
        .expect((res) => {
          if (res.status !== 200 && res.status !== 201) {
            throw new Error(`expected 200 or 201, got ${res.status}`);
          }
        });

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'jane@example.com', password: 'super-secret-password' });

      expect(response.status).toBe(200);

      const setCookieHeader = response.headers['set-cookie'];
      expect(setCookieHeader).toBeDefined();
      expect(
        (Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader]).some(
          (cookie: string) => cookie.startsWith('access_token='),
        ),
      ).toBe(true);

      expect(response.body).toEqual({
        id: expect.any(String),
        email: 'jane@example.com',
        name: 'Jane Doe',
      });
      expect(response.body.passwordHash).toBeUndefined();
    });

    it('returns 401 with no Set-Cookie header when the password is wrong', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'wrongpass@example.com',
          password: 'super-secret-password',
          name: 'Auth E2E Wrong Pass',
        })
        .expect((res) => {
          if (res.status !== 200 && res.status !== 201) {
            throw new Error(`expected 200 or 201, got ${res.status}`);
          }
        });

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'wrongpass@example.com', password: 'totally-wrong-password' });

      expect(response.status).toBe(401);
      expect(response.headers['set-cookie']).toBeUndefined();
    });

    it('returns 401 with no Set-Cookie header when the email was never registered', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'never-registered@example.com', password: 'whatever-password' });

      expect(response.status).toBe(401);
      expect(response.headers['set-cookie']).toBeUndefined();
    });
  });

  describe('GET /auth/me', () => {
    it('returns 401 when no cookie is sent', async () => {
      const response = await request(app.getHttpServer()).get('/auth/me');

      expect(response.status).toBe(401);
    });

    it('returns the current user using only the cookie set at login', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'me@example.com', password: 'super-secret-password', name: 'Jane Doe' })
        .expect((res) => {
          if (res.status !== 200 && res.status !== 201) {
            throw new Error(`expected 200 or 201, got ${res.status}`);
          }
        });

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'me@example.com', password: 'super-secret-password' });

      const setCookieHeader = loginResponse.headers['set-cookie'];
      const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];

      const response = await request(app.getHttpServer()).get('/auth/me').set('Cookie', cookies);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        id: expect.any(String),
        email: 'me@example.com',
        name: 'Jane Doe',
      });
      expect(response.body.passwordHash).toBeUndefined();
    });
  });

  describe('POST /auth/logout', () => {
    it('clears the access_token cookie and logs the user out of GET /auth/me', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'logout@example.com', password: 'super-secret-password', name: 'Jane Doe' })
        .expect((res) => {
          if (res.status !== 200 && res.status !== 201) {
            throw new Error(`expected 200 or 201, got ${res.status}`);
          }
        });

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'logout@example.com', password: 'super-secret-password' });

      const loginSetCookieHeader = loginResponse.headers['set-cookie'];
      const loginCookies = Array.isArray(loginSetCookieHeader)
        ? loginSetCookieHeader
        : [loginSetCookieHeader];

      const logoutResponse = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Cookie', loginCookies);

      expect(logoutResponse.status).toBe(204);

      const logoutSetCookieHeader = logoutResponse.headers['set-cookie'];
      expect(logoutSetCookieHeader).toBeDefined();
      const logoutCookies = Array.isArray(logoutSetCookieHeader)
        ? logoutSetCookieHeader
        : [logoutSetCookieHeader];
      expect(
        logoutCookies.some(
          (cookie: string) =>
            cookie.startsWith('access_token=') &&
            (cookie.includes('Expires=') || cookie.includes('Max-Age=0')),
        ),
      ).toBe(true);

      const meResponse = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Cookie', logoutCookies);

      expect(meResponse.status).toBe(401);
    });

    it('returns 401 when no cookie is sent', async () => {
      const response = await request(app.getHttpServer()).post('/auth/logout');

      expect(response.status).toBe(401);
    });
  });
});
