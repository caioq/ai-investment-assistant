import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
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
    await app.init();

    prisma = moduleFixture.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(async () => {
    await prisma.user.deleteMany();
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
        .send({ email: 'dupe@example.com', password: 'super-secret-password' })
        .expect((res) => {
          if (res.status !== 200 && res.status !== 201) {
            throw new Error(`expected 200 or 201, got ${res.status}`);
          }
        });

      const secondResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'dupe@example.com', password: 'another-password' });

      expect(secondResponse.status).toBeGreaterThanOrEqual(400);
      expect(secondResponse.status).toBeLessThan(500);

      const users = await prisma.user.findMany({ where: { email: 'dupe@example.com' } });
      expect(users).toHaveLength(1);
    });
  });
});
