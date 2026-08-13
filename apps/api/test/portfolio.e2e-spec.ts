import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { MarketDataService } from '../src/market-data/market-data.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('PortfolioController (e2e) - POST /portfolio/holdings', () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;
  let prisma: PrismaService;

  // Stubs `MarketDataService` so `backfillHistory` never hits live Yahoo
  // Finance (CONVENTIONS.md -> "Testing"), and so the test can assert on
  // whether/how often it was called without a real network dependency.
  const marketDataServiceStub = {
    backfillHistory: jest.fn().mockResolvedValue(undefined),
  } as unknown as MarketDataService;

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MarketDataService)
      .useValue(marketDataServiceStub)
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = moduleFixture.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Scoped to rows this suite creates, rather than an unscoped `deleteMany()`
  // — e2e suites run in parallel against the same test Postgres
  // (CONVENTIONS.md -> "Testing").
  afterEach(async () => {
    await prisma.holding.deleteMany({
      where: { asset: { ticker: { in: ['PETR4', 'VALE3', 'ITUB4'] } } },
    });
    await prisma.asset.deleteMany({ where: { ticker: { in: ['PETR4', 'VALE3', 'ITUB4'] } } });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            'portfolio-e2e-1@example.com',
            'portfolio-e2e-2@example.com',
            'portfolio-e2e-3@example.com',
            'portfolio-e2e-4@example.com',
          ],
        },
      },
    });
  });

  /** Registers + logs in a user, returning the `access_token` cookie array. */
  async function authCookies(email: string): Promise<string[]> {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'super-secret-password' });

    const setCookieHeader = response.headers['set-cookie'];
    return Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  }

  it('returns 401 when no auth cookie is sent', async () => {
    const response = await request(app.getHttpServer())
      .post('/portfolio/holdings')
      .send({ ticker: 'PETR4', quantity: 100, avgPrice: 30 });

    expect(response.status).toBe(401);
  });

  it('creates the Asset and the Holding in one request for a ticker never seen before', async () => {
    const cookies = await authCookies('portfolio-e2e-1@example.com');

    const response = await request(app.getHttpServer())
      .post('/portfolio/holdings')
      .set('Cookie', cookies)
      .send({ ticker: 'PETR4', quantity: 100, avgPrice: 30 });

    expect(response.status).toBeGreaterThanOrEqual(200);
    expect(response.status).toBeLessThan(300);

    const asset = await prisma.asset.findUnique({ where: { ticker: 'PETR4' } });
    expect(asset).not.toBeNull();

    const holdings = await prisma.holding.findMany({ where: { assetId: asset!.id } });
    expect(holdings).toHaveLength(1);
    expect(holdings[0].quantity).toBe(100);
    expect(holdings[0].avgPrice).toBe(30);

    // AC-1's backfill trigger: called once, for the newly-created asset.
    expect(marketDataServiceStub.backfillHistory).toHaveBeenCalledTimes(1);
    expect(marketDataServiceStub.backfillHistory).toHaveBeenCalledWith(asset!.id);
  });

  it('updates quantity/avgPrice rather than duplicating when the same ticker is posted again', async () => {
    const cookies = await authCookies('portfolio-e2e-2@example.com');

    await request(app.getHttpServer())
      .post('/portfolio/holdings')
      .set('Cookie', cookies)
      .send({ ticker: 'VALE3', quantity: 100, avgPrice: 30 });

    jest.clearAllMocks();

    const response = await request(app.getHttpServer())
      .post('/portfolio/holdings')
      .set('Cookie', cookies)
      .send({ ticker: 'VALE3', quantity: 150, avgPrice: 32 });

    expect(response.status).toBeGreaterThanOrEqual(200);
    expect(response.status).toBeLessThan(300);

    const asset = await prisma.asset.findUnique({ where: { ticker: 'VALE3' } });
    const holdings = await prisma.holding.findMany({ where: { assetId: asset!.id } });

    expect(holdings).toHaveLength(1);
    expect(holdings[0].quantity).toBe(150);
    expect(holdings[0].avgPrice).toBe(32);

    // The asset already existed, so backfill must not fire again.
    expect(marketDataServiceStub.backfillHistory).not.toHaveBeenCalled();
  });

  it('normalises the ticker to uppercase so a case-variant does not create a second Asset', async () => {
    const cookies = await authCookies('portfolio-e2e-2@example.com');

    await request(app.getHttpServer())
      .post('/portfolio/holdings')
      .set('Cookie', cookies)
      .send({ ticker: 'VALE3', quantity: 100, avgPrice: 30 });

    const response = await request(app.getHttpServer())
      .post('/portfolio/holdings')
      .set('Cookie', cookies)
      .send({ ticker: 'vale3', quantity: 120, avgPrice: 31 });

    expect(response.status).toBeGreaterThanOrEqual(200);
    expect(response.status).toBeLessThan(300);

    const assets = await prisma.asset.findMany({ where: { ticker: 'VALE3' } });
    expect(assets).toHaveLength(1);
  });

  it('still persists the Holding and returns 2xx when backfillHistory rejects', async () => {
    marketDataServiceStub.backfillHistory = jest.fn().mockRejectedValue(new Error('Yahoo is down'));

    const cookies = await authCookies('portfolio-e2e-3@example.com');

    const response = await request(app.getHttpServer())
      .post('/portfolio/holdings')
      .set('Cookie', cookies)
      .send({ ticker: 'ITUB4', quantity: 50, avgPrice: 25 });

    expect(response.status).toBeGreaterThanOrEqual(200);
    expect(response.status).toBeLessThan(300);

    const asset = await prisma.asset.findUnique({ where: { ticker: 'ITUB4' } });
    expect(asset).not.toBeNull();

    const holdings = await prisma.holding.findMany({ where: { assetId: asset!.id } });
    expect(holdings).toHaveLength(1);
  });
});
