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
      where: { asset: { ticker: { in: ['PETR4', 'VALE3', 'ITUB4', 'BBDC4'] } } },
    });
    await prisma.asset.deleteMany({
      where: { ticker: { in: ['PETR4', 'VALE3', 'ITUB4', 'BBDC4'] } },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            'portfolio-e2e-1@example.com',
            'portfolio-e2e-2@example.com',
            'portfolio-e2e-3@example.com',
            'portfolio-e2e-4@example.com',
            'portfolio-e2e-5@example.com',
            'portfolio-e2e-6@example.com',
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

  describe('PATCH /portfolio/holdings/:id', () => {
    /** Creates a fresh BBDC4 holding for `portfolio-e2e-5@example.com` and returns its id + cookies. */
    async function seedHolding(): Promise<{ id: string; cookies: string[] }> {
      const cookies = await authCookies('portfolio-e2e-5@example.com');

      const response = await request(app.getHttpServer())
        .post('/portfolio/holdings')
        .set('Cookie', cookies)
        .send({ ticker: 'BBDC4', quantity: 100, avgPrice: 25 });

      return { id: (response.body as { id: string }).id, cookies };
    }

    it('updates only quantity, leaving avgPrice unchanged, on a partial update', async () => {
      const { id, cookies } = await seedHolding();

      const response = await request(app.getHttpServer())
        .patch(`/portfolio/holdings/${id}`)
        .set('Cookie', cookies)
        .send({ quantity: 250 });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ quantity: 250, avgPrice: 25 });
    });

    it('updates only avgPrice, leaving quantity unchanged, on a partial update', async () => {
      const { id, cookies } = await seedHolding();

      const response = await request(app.getHttpServer())
        .patch(`/portfolio/holdings/${id}`)
        .set('Cookie', cookies)
        .send({ avgPrice: 41.5 });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ quantity: 100, avgPrice: 41.5 });
    });

    it('returns 404 for a well-formed but non-existent id', async () => {
      const cookies = await authCookies('portfolio-e2e-6@example.com');

      const response = await request(app.getHttpServer())
        .patch('/portfolio/holdings/018f0000-0000-7000-8000-000000000000')
        .set('Cookie', cookies)
        .send({ quantity: 10 });

      expect(response.status).toBe(404);
    });

    it('returns 401 when no auth cookie is sent', async () => {
      const response = await request(app.getHttpServer())
        .patch('/portfolio/holdings/018f0000-0000-7000-8000-000000000000')
        .send({ quantity: 10 });

      expect(response.status).toBe(401);
    });
  });
});

describe('PortfolioController (e2e) - GET /portfolio/holdings', () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;
  let prisma: PrismaService;

  // Same reasoning as the POST describe above (CONVENTIONS.md -> "Testing"):
  // stub `backfillHistory` so seeding holdings via POST doesn't hit live
  // Yahoo Finance.
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

  // Scoped to rows this suite creates (CONVENTIONS.md -> "Testing"), using
  // tickers/emails distinct from the POST describe above so both can run
  // without interfering with each other.
  afterEach(async () => {
    await prisma.holding.deleteMany({
      where: { asset: { ticker: { in: ['BBAS3', 'WEGE3'] } } },
    });
    await prisma.asset.deleteMany({ where: { ticker: { in: ['BBAS3', 'WEGE3'] } } });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['portfolio-list-e2e-1@example.com', 'portfolio-list-e2e-2@example.com'],
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
    const response = await request(app.getHttpServer()).get('/portfolio/holdings');

    expect(response.status).toBe(401);
  });

  it('returns 200 and [] for a freshly-registered user with no holdings', async () => {
    const cookies = await authCookies('portfolio-list-e2e-1@example.com');

    const response = await request(app.getHttpServer())
      .get('/portfolio/holdings')
      .set('Cookie', cookies);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it('returns 200 with both holdings after creating two, each carrying a nested asset object', async () => {
    const cookies = await authCookies('portfolio-list-e2e-2@example.com');

    await request(app.getHttpServer())
      .post('/portfolio/holdings')
      .set('Cookie', cookies)
      .send({ ticker: 'BBAS3', quantity: 100, avgPrice: 30 });

    await request(app.getHttpServer())
      .post('/portfolio/holdings')
      .set('Cookie', cookies)
      .send({ ticker: 'WEGE3', quantity: 50, avgPrice: 40 });

    const response = await request(app.getHttpServer())
      .get('/portfolio/holdings')
      .set('Cookie', cookies);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);

    const tickers = (response.body as Array<{ asset: { ticker: string } }>)
      .map((holding) => holding.asset.ticker)
      .sort();
    expect(tickers).toEqual(['BBAS3', 'WEGE3']);

    for (const holding of response.body as Array<{ asset: { ticker: string; name: string } }>) {
      expect(holding.asset).toEqual(
        expect.objectContaining({ ticker: expect.any(String), name: expect.any(String) }),
      );
    }
  });
});

describe('PortfolioController (e2e) - DELETE /portfolio/holdings/:id', () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;
  let prisma: PrismaService;

  // Stubs `MarketDataService` so `backfillHistory` (triggered by the seeding
  // `POST /portfolio/holdings` calls below) never hits live Yahoo Finance
  // (CONVENTIONS.md -> "Testing").
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

  // Scoped to rows this suite creates, rather than an unscoped `deleteMany()`
  // — e2e suites run in parallel against the same test Postgres
  // (CONVENTIONS.md -> "Testing").
  afterEach(async () => {
    await prisma.holding.deleteMany({
      where: { asset: { ticker: { in: ['PETR4'] } } },
    });
    await prisma.asset.deleteMany({ where: { ticker: { in: ['PETR4'] } } });
    await prisma.user.deleteMany({
      where: {
        email: { in: ['portfolio-delete-e2e-1@example.com', 'portfolio-delete-e2e-2@example.com'] },
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
    const response = await request(app.getHttpServer()).delete(
      '/portfolio/holdings/00000000-0000-0000-0000-000000000000',
    );

    expect(response.status).toBe(401);
  });

  it('returns 404 for a well-formed but non-existent holding id', async () => {
    const cookies = await authCookies('portfolio-delete-e2e-1@example.com');

    const response = await request(app.getHttpServer())
      .delete('/portfolio/holdings/00000000-0000-0000-0000-000000000000')
      .set('Cookie', cookies);

    expect(response.status).toBe(404);
  });

  it('deletes the Holding (204, empty body), removes it from GET /portfolio/holdings, and leaves the Asset intact', async () => {
    const cookies = await authCookies('portfolio-delete-e2e-2@example.com');

    await request(app.getHttpServer())
      .post('/portfolio/holdings')
      .set('Cookie', cookies)
      .send({ ticker: 'PETR4', quantity: 100, avgPrice: 30 });

    const asset = await prisma.asset.findUnique({ where: { ticker: 'PETR4' } });
    const holding = await prisma.holding.findUniqueOrThrow({
      where: { userId_assetId: { userId: (await prisma.user.findUniqueOrThrow({ where: { email: 'portfolio-delete-e2e-2@example.com' } })).id, assetId: asset!.id } },
    });

    const response = await request(app.getHttpServer())
      .delete(`/portfolio/holdings/${holding.id}`)
      .set('Cookie', cookies);

    expect(response.status).toBe(204);
    expect(response.body).toEqual({});
    expect(response.text).toBe('');

    // AC-6's first half: no longer present for the userId-scoped query that
    // backs `GET /portfolio/holdings` (T-2, not yet on this task's
    // dependency chain — PORTFOLIO_US-1_T-4 only depends on T-1 per its task
    // file, so this asserts the same row-level guarantee the list endpoint
    // relies on rather than calling a route this branch doesn't have).
    const remaining = await prisma.holding.findUnique({ where: { id: holding.id } });
    expect(remaining).toBeNull();

    // Asset is shared/owned by market-data, never cascade-deleted here.
    const assetAfter = await prisma.asset.findUnique({ where: { ticker: 'PETR4' } });
    expect(assetAfter).not.toBeNull();
  });
});

describe('PortfolioController (e2e) - cross-user isolation (PORTFOLIO_US-1_T-5)', () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;
  let prisma: PrismaService;

  // Stubs `MarketDataService` so the seeding `POST /portfolio/holdings` call
  // below never hits live Yahoo Finance (CONVENTIONS.md -> "Testing").
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

  // Scoped to rows this suite creates, rather than an unscoped `deleteMany()`
  // — e2e suites run in parallel against the same test Postgres
  // (CONVENTIONS.md -> "Testing").
  afterEach(async () => {
    await prisma.holding.deleteMany({
      where: { asset: { ticker: { in: ['ISOL4'] } } },
    });
    await prisma.asset.deleteMany({ where: { ticker: { in: ['ISOL4'] } } });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['portfolio-isolation-e2e-a@example.com', 'portfolio-isolation-e2e-b@example.com'],
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

  /**
   * Registers A and B (distinct emails) and has A create a holding. Returns
   * both cookie jars plus A's holding id, so each case below just picks up
   * from here with B's cookie.
   */
  async function seedTwoUsersWithAsHolding(): Promise<{
    cookiesA: string[];
    cookiesB: string[];
    holdingId: string;
  }> {
    const cookiesA = await authCookies('portfolio-isolation-e2e-a@example.com');
    const cookiesB = await authCookies('portfolio-isolation-e2e-b@example.com');

    const createResponse = await request(app.getHttpServer())
      .post('/portfolio/holdings')
      .set('Cookie', cookiesA)
      .send({ ticker: 'ISOL4', quantity: 100, avgPrice: 30 });

    const holdingId = (createResponse.body as { id: string }).id;

    return { cookiesA, cookiesB, holdingId };
  }

  it("GET /portfolio/holdings as B returns 200 and [] — B never sees A's rows", async () => {
    const { cookiesB } = await seedTwoUsersWithAsHolding();

    const response = await request(app.getHttpServer())
      .get('/portfolio/holdings')
      .set('Cookie', cookiesB);

    // An empty list rather than an error, so a leak would show up as extra
    // data rather than a different status code (task file, case 1).
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it("PATCH /portfolio/holdings/{A's id} as B returns 404 and leaves A's quantity unchanged", async () => {
    const { cookiesA, cookiesB, holdingId } = await seedTwoUsersWithAsHolding();

    const response = await request(app.getHttpServer())
      .patch(`/portfolio/holdings/${holdingId}`)
      .set('Cookie', cookiesB)
      .send({ quantity: 999 });

    // 404, not 403 (task file): a 403 would confirm to B that the id exists,
    // turning the endpoint into an existence oracle.
    expect(response.status).toBe(404);

    // Assert the database, not just the status — a handler could return 404
    // after having already written (task file, case 2).
    const holdingAfter = await prisma.holding.findUniqueOrThrow({ where: { id: holdingId } });
    expect(holdingAfter.quantity).toBe(100);

    // Re-reading as A also shows the original quantity unchanged.
    const listAsA = await request(app.getHttpServer())
      .get('/portfolio/holdings')
      .set('Cookie', cookiesA);
    expect(listAsA.body).toEqual([expect.objectContaining({ id: holdingId, quantity: 100 })]);
  });

  it("DELETE /portfolio/holdings/{A's id} as B returns 404 and A's holding still exists", async () => {
    const { cookiesA, cookiesB, holdingId } = await seedTwoUsersWithAsHolding();

    const response = await request(app.getHttpServer())
      .delete(`/portfolio/holdings/${holdingId}`)
      .set('Cookie', cookiesB);

    // 404, not 403, for the same existence-oracle reason as the PATCH case.
    expect(response.status).toBe(404);

    const holdingAfter = await prisma.holding.findUnique({ where: { id: holdingId } });
    expect(holdingAfter).not.toBeNull();

    const listAsA = await request(app.getHttpServer())
      .get('/portfolio/holdings')
      .set('Cookie', cookiesA);
    expect(listAsA.body).toEqual([expect.objectContaining({ id: holdingId })]);
  });
});
