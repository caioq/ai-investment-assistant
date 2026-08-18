import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { PRICE_PROVIDER, PriceProvider } from '../src/market-data/providers/price-provider.interface';
import { PrismaService } from '../src/prisma/prisma.service';

describe('MarketDataController (e2e)', () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;
  let prisma: PrismaService;

  // Stubs the upstream Yahoo Finance call so the debug endpoint's 200 case
  // doesn't depend on a live network request — see MARKET_DATA_US-4_T-1's
  // `getOrRefreshPrice`, which this endpoint delegates to.
  const priceProviderStub: PriceProvider = {
    getQuote: jest.fn().mockResolvedValue([{ ticker: 'MDTA4', price: 38.5, changePct: 1.2 }]),
    getHistory: jest.fn(),
  };

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PRICE_PROVIDER)
      .useValue(priceProviderStub)
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = moduleFixture.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  // Scoped to rows this suite creates (by ticker/email), rather than an
  // unscoped `deleteMany()` — jest e2e suites run in parallel workers
  // against the same test Postgres (see CONVENTIONS.md -> "Testing"), and
  // `auth.e2e-spec.ts` concurrently reads/writes the `user` table too; a
  // blanket delete here would race with it.
  afterEach(async () => {
    await prisma.asset.deleteMany({ where: { ticker: { in: ['MDTA4', 'UNKNOWN4'] } } });
    await prisma.user.deleteMany({ where: { email: 'market-data-e2e@example.com' } });
  });

  /** Registers + logs in a user, returning the `access_token` cookie array. */
  async function authCookies(): Promise<string[]> {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'market-data-e2e@example.com', password: 'super-secret-password' });

    const setCookieHeader = response.headers['set-cookie'];
    return Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  }

  describe('GET /market-data/quote/:ticker', () => {
    it('returns 401 when no cookie is sent', async () => {
      const response = await request(app.getHttpServer()).get('/market-data/quote/MDTA4');

      expect(response.status).toBe(401);
    });

    it('returns 200 with the quote for a seeded Asset ticker', async () => {
      const cookies = await authCookies();
      await prisma.asset.create({ data: { ticker: 'MDTA4', name: 'Market Data Test Asset' } });

      const response = await request(app.getHttpServer())
        .get('/market-data/quote/MDTA4')
        .set('Cookie', cookies);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        ticker: 'MDTA4',
        price: 38.5,
        changePct: 1.2,
        updatedAt: expect.any(String),
      });
    });

    it('returns 404 for an unknown ticker', async () => {
      const cookies = await authCookies();

      const response = await request(app.getHttpServer())
        .get('/market-data/quote/UNKNOWN4')
        .set('Cookie', cookies);

      expect(response.status).toBe(404);
    });
  });
});
