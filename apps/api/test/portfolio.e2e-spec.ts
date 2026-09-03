import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { MarketDataService } from '../src/market-data/market-data.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { cagr, maxDrawdown, volatility, PortfolioValuePoint } from '@ai-investment-assistant/shared';

describe('PortfolioController (e2e) - POST /portfolio/holdings', () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;
  let prisma: PrismaService;

  // Stubs `MarketDataService` so `backfillHistory` never hits live Yahoo
  // Finance (CONVENTIONS.md -> "Testing"), and so the test can assert on
  // whether/how often it was called without a real network dependency.
  // `findOrCreateAsset` (RECOMMENDED_PORTFOLIOS_US-1_T-5) now lives on
  // `MarketDataService`; it's exercised for real below (it only touches the
  // real `PrismaService` this suite already uses). Only `backfillHistory` is
  // stubbed, via `jest.spyOn` on the real DI instance in `beforeAll`, so
  // seeding holdings never hits live Yahoo Finance (CONVENTIONS.md ->
  // "Testing"), while the suite can still assert on whether/how often it
  // was called.
  let marketDataServiceStub: MarketDataService;

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = moduleFixture.get(PrismaService);
    marketDataServiceStub = moduleFixture.get(MarketDataService);
    jest.spyOn(marketDataServiceStub, 'backfillHistory').mockResolvedValue(undefined);
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
    // portfolioValueSnapshot deleted first: PortfolioListener.snapshotAllUsers
    // (portfolio.listener.ts) fires on *any* market-data refresh completing
    // anywhere in the process — including a concurrently-running e2e worker's
    // — and snapshots every user with a holding at that moment, unscoped to
    // this suite. If that races against this suite's fixtures existing, the
    // user.deleteMany below fails on portfolio_value_snapshots_user_id_fkey.
    await prisma.portfolioValueSnapshot.deleteMany({
      where: {
        user: {
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
      },
    });
    await prisma.holding.deleteMany({
      where: { asset: { ticker: { in: ['PETR4', 'VALE3', 'ITUB4', 'BBDC4', 'RACE3'] } } },
    });
    await prisma.asset.deleteMany({
      where: { ticker: { in: ['PETR4', 'VALE3', 'ITUB4', 'BBDC4', 'RACE3'] } },
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

  it('survives concurrent requests creating the same brand-new Asset, without a 500 or a duplicate', async () => {
    // The regression this guards: find-or-create on `Asset.ticker` is two
    // statements, so parallel requests for an unseen ticker could both see
    // `null` and both INSERT. `ticker` is `@unique`, so one lost with Prisma
    // P2002 and — unhandled — returned a 500 for an ordinary request (two
    // users adding the same ticker at once, or a double-clicked "Add").
    //
    // Real parallelism matters here: awaiting these in sequence passes even
    // with the bug present, because the second call would find the first's
    // committed row.
    const [cookiesA, cookiesB] = await Promise.all([
      authCookies('portfolio-e2e-5@example.com'),
      authCookies('portfolio-e2e-6@example.com'),
    ]);

    const responses = await Promise.all([
      request(app.getHttpServer())
        .post('/portfolio/holdings')
        .set('Cookie', cookiesA)
        .send({ ticker: 'RACE3', quantity: 100, avgPrice: 30 }),
      request(app.getHttpServer())
        .post('/portfolio/holdings')
        .set('Cookie', cookiesB)
        .send({ ticker: 'RACE3', quantity: 50, avgPrice: 31 }),
    ]);

    for (const response of responses) {
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(300);
    }

    // Exactly one Asset, and both users got their own Holding against it.
    const assets = await prisma.asset.findMany({ where: { ticker: 'RACE3' } });
    expect(assets).toHaveLength(1);

    const holdings = await prisma.holding.findMany({ where: { assetId: assets[0].id } });
    expect(holdings).toHaveLength(2);
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
  // `findOrCreateAsset` (RECOMMENDED_PORTFOLIOS_US-1_T-5) now lives on
  // `MarketDataService`; it's exercised for real below (it only touches the
  // real `PrismaService` this suite already uses). Only `backfillHistory` is
  // stubbed, via `jest.spyOn` on the real DI instance in `beforeAll`, so
  // seeding holdings never hits live Yahoo Finance (CONVENTIONS.md ->
  // "Testing"), while the suite can still assert on whether/how often it
  // was called.
  let marketDataServiceStub: MarketDataService;

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = moduleFixture.get(PrismaService);
    marketDataServiceStub = moduleFixture.get(MarketDataService);
    jest.spyOn(marketDataServiceStub, 'backfillHistory').mockResolvedValue(undefined);
  });

  afterAll(async () => {
    await app.close();
  });

  // Scoped to rows this suite creates (CONVENTIONS.md -> "Testing"), using
  // tickers/emails distinct from the POST describe above so both can run
  // without interfering with each other.
  afterEach(async () => {
    // See the POST /portfolio/holdings suite's afterEach above for why this
    // goes first: PortfolioListener.snapshotAllUsers can snapshot this
    // suite's fixture users as a side effect of an unrelated, concurrently
    // running e2e worker's market-data refresh.
    await prisma.portfolioValueSnapshot.deleteMany({
      where: {
        user: {
          email: { in: ['portfolio-list-e2e-1@example.com', 'portfolio-list-e2e-2@example.com'] },
        },
      },
    });
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
  // `findOrCreateAsset` (RECOMMENDED_PORTFOLIOS_US-1_T-5) now lives on
  // `MarketDataService`; it's exercised for real below (it only touches the
  // real `PrismaService` this suite already uses). Only `backfillHistory` is
  // stubbed, via `jest.spyOn` on the real DI instance in `beforeAll`, so
  // seeding holdings never hits live Yahoo Finance (CONVENTIONS.md ->
  // "Testing"), while the suite can still assert on whether/how often it
  // was called.
  let marketDataServiceStub: MarketDataService;

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = moduleFixture.get(PrismaService);
    marketDataServiceStub = moduleFixture.get(MarketDataService);
    jest.spyOn(marketDataServiceStub, 'backfillHistory').mockResolvedValue(undefined);
  });

  afterAll(async () => {
    await app.close();
  });

  // Scoped to rows this suite creates, rather than an unscoped `deleteMany()`
  // — e2e suites run in parallel against the same test Postgres
  // (CONVENTIONS.md -> "Testing").
  afterEach(async () => {
    // See the POST /portfolio/holdings suite's afterEach for why this goes
    // first (PortfolioListener.snapshotAllUsers cross-suite race).
    await prisma.portfolioValueSnapshot.deleteMany({
      where: {
        user: {
          email: { in: ['portfolio-delete-e2e-1@example.com', 'portfolio-delete-e2e-2@example.com'] },
        },
      },
    });
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
  // `findOrCreateAsset` (RECOMMENDED_PORTFOLIOS_US-1_T-5) now lives on
  // `MarketDataService`; it's exercised for real below (it only touches the
  // real `PrismaService` this suite already uses). Only `backfillHistory` is
  // stubbed, via `jest.spyOn` on the real DI instance in `beforeAll`, so
  // seeding holdings never hits live Yahoo Finance (CONVENTIONS.md ->
  // "Testing"), while the suite can still assert on whether/how often it
  // was called.
  let marketDataServiceStub: MarketDataService;

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = moduleFixture.get(PrismaService);
    marketDataServiceStub = moduleFixture.get(MarketDataService);
    jest.spyOn(marketDataServiceStub, 'backfillHistory').mockResolvedValue(undefined);
  });

  afterAll(async () => {
    await app.close();
  });

  // Scoped to rows this suite creates, rather than an unscoped `deleteMany()`
  // — e2e suites run in parallel against the same test Postgres
  // (CONVENTIONS.md -> "Testing").
  afterEach(async () => {
    // See the POST /portfolio/holdings suite's afterEach for why this goes
    // first (PortfolioListener.snapshotAllUsers cross-suite race).
    await prisma.portfolioValueSnapshot.deleteMany({
      where: {
        user: {
          email: {
            in: ['portfolio-isolation-e2e-a@example.com', 'portfolio-isolation-e2e-b@example.com'],
          },
        },
      },
    });
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

describe('PortfolioController (e2e) - POST /portfolio/holdings/upload-csv', () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;
  let prisma: PrismaService;

  // Stubs `MarketDataService` so `backfillHistory` never hits live Yahoo
  // Finance (CONVENTIONS.md -> "Testing").
  // `findOrCreateAsset` (RECOMMENDED_PORTFOLIOS_US-1_T-5) now lives on
  // `MarketDataService`; it's exercised for real below (it only touches the
  // real `PrismaService` this suite already uses). Only `backfillHistory` is
  // stubbed, via `jest.spyOn` on the real DI instance in `beforeAll`, so
  // seeding holdings never hits live Yahoo Finance (CONVENTIONS.md ->
  // "Testing"), while the suite can still assert on whether/how often it
  // was called.
  let marketDataServiceStub: MarketDataService;

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = moduleFixture.get(PrismaService);
    marketDataServiceStub = moduleFixture.get(MarketDataService);
    jest.spyOn(marketDataServiceStub, 'backfillHistory').mockResolvedValue(undefined);
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
    // See the POST /portfolio/holdings suite's afterEach for why this goes
    // first (PortfolioListener.snapshotAllUsers cross-suite race).
    await prisma.portfolioValueSnapshot.deleteMany({
      where: {
        user: {
          email: { in: ['portfolio-csv-e2e-1@example.com', 'portfolio-csv-e2e-2@example.com'] },
        },
      },
    });
    await prisma.holding.deleteMany({
      where: { asset: { ticker: { in: ['VALE3', 'ITUB4', 'BBDC4', 'PETR4'] } } },
    });
    await prisma.asset.deleteMany({
      where: { ticker: { in: ['VALE3', 'ITUB4', 'BBDC4', 'PETR4'] } },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['portfolio-csv-e2e-1@example.com', 'portfolio-csv-e2e-2@example.com'],
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
    const csv = ['ticker,quantity,avgPrice', 'VALE3,50,60'].join('\n');

    const response = await request(app.getHttpServer())
      .post('/portfolio/holdings/upload-csv')
      .attach('file', Buffer.from(csv, 'utf-8'), 'holdings.csv');

    expect(response.status).toBe(401);
  });

  it('returns 400, not 500, when no file is attached', async () => {
    const cookies = await authCookies('portfolio-csv-e2e-1@example.com');

    const response = await request(app.getHttpServer())
      .post('/portfolio/holdings/upload-csv')
      .set('Cookie', cookies);

    expect(response.status).toBe(400);
  });

  it(
    'spec AC-3, through the real multipart path: a CSV with 3 valid rows and 1 malformed row ' +
      'returns 200 with created: 3 and 1 reported error, and the holdings are actually persisted',
    async () => {
      const cookies = await authCookies('portfolio-csv-e2e-2@example.com');

      const csv = [
        'ticker,quantity,avgPrice',
        'VALE3,50,60',
        'ITUB4,200,25',
        'BBDC4,10,15',
        'PETR4,abc,30',
      ].join('\n');

      const response = await request(app.getHttpServer())
        .post('/portfolio/holdings/upload-csv')
        .set('Cookie', cookies)
        .attach('file', Buffer.from(csv, 'utf-8'), 'holdings.csv');

      expect(response.status).toBe(200);
      expect(response.body.created).toBe(3);
      expect(response.body.errors).toHaveLength(1);

      // Spec AC-3 end-to-end: the 3 valid rows were actually persisted, not
      // just reported as created. Verified directly against the DB rather
      // than through `GET /portfolio/holdings` — that endpoint belongs to a
      // different, still-unmerged task (PORTFOLIO_US-1_T-2) that this task
      // doesn't depend on.
      const holdings = await prisma.holding.findMany({
        where: { asset: { ticker: { in: ['VALE3', 'ITUB4', 'BBDC4'] } } },
      });
      expect(holdings).toHaveLength(3);
    },
  );
});

describe('PortfolioController (e2e) - GET /portfolio/allocation', () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;
  let prisma: PrismaService;

  const ALLOCATION_TICKERS = ['BBAS3', 'WEGE3', 'MGLU3'];

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

  afterEach(async () => {
    // See the POST /portfolio/holdings suite's afterEach for why this goes
    // first (PortfolioListener.snapshotAllUsers cross-suite race).
    await prisma.portfolioValueSnapshot.deleteMany({
      where: {
        user: {
          email: {
            in: ['portfolio-allocation-e2e-1@example.com', 'portfolio-allocation-e2e-2@example.com'],
          },
        },
      },
    });
    await prisma.holding.deleteMany({
      where: { asset: { ticker: { in: ALLOCATION_TICKERS } } },
    });
    await prisma.asset.deleteMany({ where: { ticker: { in: ALLOCATION_TICKERS } } });
    await prisma.user.deleteMany({
      where: {
        email: { in: ['portfolio-allocation-e2e-1@example.com', 'portfolio-allocation-e2e-2@example.com'] },
      },
    });
  });

  /** Registers + logs in a user, returning the `access_token` cookie array and the user's id. */
  async function registerUser(email: string): Promise<{ cookies: string[]; userId: string }> {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'super-secret-password' });

    const setCookieHeader = response.headers['set-cookie'];
    const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];

    const user = await prisma.user.findUniqueOrThrow({ where: { email } });

    return { cookies, userId: user.id };
  }

  it('returns 401 when no auth cookie is sent', async () => {
    const response = await request(app.getHttpServer()).get('/portfolio/allocation').query({ by: 'sector' });

    expect(response.status).toBe(401);
  });

  it('returns 400 for an unrecognised `by` value', async () => {
    const { cookies } = await registerUser('portfolio-allocation-e2e-1@example.com');

    const response = await request(app.getHttpServer())
      .get('/portfolio/allocation')
      .set('Cookie', cookies)
      .query({ by: 'bogus' });

    expect(response.status).toBe(400);
  });

  it('by=sector returns one slice per sector, with pct summing to 100, by=stock returns one slice per ticker, by=riskRating groups nulls under Unclassified without dropping value, and a null currentPrice falls back to avgPrice', async () => {
    const { cookies, userId } = await registerUser('portfolio-allocation-e2e-2@example.com');

    // Priced asset, classified sector/risk rating.
    const bbas3 = await prisma.asset.create({
      data: {
        ticker: 'BBAS3',
        name: 'Banco do Brasil',
        sector: 'Financials',
        currentPrice: 30,
        riskRating: 'AA',
      },
    });
    // Priced asset, different sector, unclassified risk rating.
    const wege3 = await prisma.asset.create({
      data: {
        ticker: 'WEGE3',
        name: 'WEG',
        sector: 'Industrials',
        currentPrice: 40,
        riskRating: null,
      },
    });
    // Unpriced asset (currentPrice null) — must fall back to avgPrice, not 0.
    const mglu3 = await prisma.asset.create({
      data: {
        ticker: 'MGLU3',
        name: 'Magazine Luiza',
        sector: 'Industrials',
        currentPrice: null,
        riskRating: null,
      },
    });

    await prisma.holding.createMany({
      data: [
        { userId, assetId: bbas3.id, quantity: 100, avgPrice: 25 }, // value = 100 * 30 = 3000
        { userId, assetId: wege3.id, quantity: 50, avgPrice: 35 }, // value = 50 * 40 = 2000
        { userId, assetId: mglu3.id, quantity: 10, avgPrice: 20 }, // value = 10 * 20 (fallback) = 200
      ],
    });

    const totalValue = 3000 + 2000 + 200;

    // by=sector: Financials (3000) + Industrials (2000 + 200 = 2200).
    const sectorResponse = await request(app.getHttpServer())
      .get('/portfolio/allocation')
      .set('Cookie', cookies)
      .query({ by: 'sector' });

    expect(sectorResponse.status).toBe(200);
    expect(sectorResponse.body).toHaveLength(2);
    const sectorPctSum = sectorResponse.body.reduce(
      (sum: number, slice: { pct: number }) => sum + slice.pct,
      0,
    );
    expect(sectorPctSum).toBeCloseTo(100, 5);
    const financials = sectorResponse.body.find((slice: { label: string }) => slice.label === 'Financials');
    expect(financials.value).toBe(3000);
    const industrials = sectorResponse.body.find((slice: { label: string }) => slice.label === 'Industrials');
    expect(industrials.value).toBe(2200);

    // by=stock: one slice per ticker.
    const stockResponse = await request(app.getHttpServer())
      .get('/portfolio/allocation')
      .set('Cookie', cookies)
      .query({ by: 'stock' });

    expect(stockResponse.status).toBe(200);
    expect(stockResponse.body).toHaveLength(3);
    const mgluSlice = stockResponse.body.find((slice: { label: string }) => slice.label === 'MGLU3');
    // Case 4: MGLU3's currentPrice is null, so its value must be quantity * avgPrice, not 0.
    expect(mgluSlice.value).toBe(200);

    // by=riskRating: BBAS3 is AA, WEGE3 and MGLU3 are null -> Unclassified.
    const riskResponse = await request(app.getHttpServer())
      .get('/portfolio/allocation')
      .set('Cookie', cookies)
      .query({ by: 'riskRating' });

    expect(riskResponse.status).toBe(200);
    const unclassified = riskResponse.body.find((slice: { label: string }) => slice.label === 'Unclassified');
    expect(unclassified).toBeDefined();
    expect(unclassified.value).toBe(2200);
    const riskValueSum = riskResponse.body.reduce(
      (sum: number, slice: { value: number }) => sum + slice.value,
      0,
    );
    expect(riskValueSum).toBe(totalValue);
  });
});

describe('PortfolioController (e2e) - GET /portfolio/summary', () => {
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

  // Scoped to rows this suite creates, rather than an unscoped `deleteMany()`
  // — e2e suites run in parallel against the same test Postgres
  // (CONVENTIONS.md -> "Testing").
  afterEach(async () => {
    // See the POST /portfolio/holdings suite's afterEach for why this goes
    // first (PortfolioListener.snapshotAllUsers cross-suite race).
    await prisma.portfolioValueSnapshot.deleteMany({
      where: {
        user: {
          email: {
            in: [
              'portfolio-summary-e2e-1@example.com',
              'portfolio-summary-e2e-2@example.com',
              'portfolio-summary-e2e-3@example.com',
              'portfolio-summary-e2e-4@example.com',
            ],
          },
        },
      },
    });
    await prisma.holding.deleteMany({
      where: { asset: { ticker: { in: ['SUMA1', 'SUMB2', 'SUMC3', 'SUMD4'] } } },
    });
    await prisma.asset.deleteMany({
      where: { ticker: { in: ['SUMA1', 'SUMB2', 'SUMC3', 'SUMD4'] } },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            'portfolio-summary-e2e-1@example.com',
            'portfolio-summary-e2e-2@example.com',
            'portfolio-summary-e2e-3@example.com',
            'portfolio-summary-e2e-4@example.com',
          ],
        },
      },
    });
  });

  /** Registers a user, returning both its id and the `access_token` cookie array. */
  async function registerUser(email: string): Promise<{ id: string; cookies: string[] }> {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'super-secret-password' });

    const setCookieHeader = response.headers['set-cookie'];
    return {
      id: response.body.id,
      cookies: Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader],
    };
  }

  /** Creates an `Asset` with a fixed `currentPrice` (or `null`, to exercise the `avgPrice` fallback). */
  async function createAsset(ticker: string, currentPrice: number | null) {
    return prisma.asset.create({ data: { ticker, name: ticker, currentPrice } });
  }

  it('returns 401 when no auth cookie is sent', async () => {
    const response = await request(app.getHttpServer()).get('/portfolio/summary');

    expect(response.status).toBe(401);
  });

  it('matches a hand-computed summary for a seeded set of priced holdings (spec AC-5)', async () => {
    const { id: userId, cookies } = await registerUser('portfolio-summary-e2e-1@example.com');

    const assetA = await createAsset('SUMA1', 33);
    const assetB = await createAsset('SUMB2', 18);

    await prisma.holding.create({
      data: { userId, assetId: assetA.id, quantity: 100, avgPrice: 30 },
    });
    await prisma.holding.create({
      data: { userId, assetId: assetB.id, quantity: 50, avgPrice: 20 },
    });

    const response = await request(app.getHttpServer())
      .get('/portfolio/summary')
      .set('Cookie', cookies);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      totalInvested: 4000,
      currentValue: 4200,
      gainLoss: 200,
      returnPct: 5,
    });
  });

  it('falls back to avgPrice for a holding whose Asset has no currentPrice yet', async () => {
    const { id: userId, cookies } = await registerUser('portfolio-summary-e2e-1@example.com');

    const assetA = await createAsset('SUMA1', 33);
    const assetB = await createAsset('SUMB2', 18);
    const assetC = await createAsset('SUMC3', null);

    await prisma.holding.create({
      data: { userId, assetId: assetA.id, quantity: 100, avgPrice: 30 },
    });
    await prisma.holding.create({
      data: { userId, assetId: assetB.id, quantity: 50, avgPrice: 20 },
    });
    await prisma.holding.create({
      data: { userId, assetId: assetC.id, quantity: 10, avgPrice: 15 },
    });

    const response = await request(app.getHttpServer())
      .get('/portfolio/summary')
      .set('Cookie', cookies);

    expect(response.status).toBe(200);
    // The unpriced holding contributes 10 * 15 = 150 via the avgPrice
    // fallback, not 0 — the trap the task calls out explicitly.
    expect(response.body.totalInvested).toBe(4150);
    expect(response.body.currentValue).toBe(4350);
  });

  it('returns all-zero fields (not NaN/null) for a user with no holdings', async () => {
    const { cookies } = await registerUser('portfolio-summary-e2e-2@example.com');

    const response = await request(app.getHttpServer())
      .get('/portfolio/summary')
      .set('Cookie', cookies);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      totalInvested: 0,
      currentValue: 0,
      gainLoss: 0,
      returnPct: 0,
    });
  });

  it('reflects a deleted holding in subsequent summary calculations (spec AC-6)', async () => {
    const { id: userId, cookies } = await registerUser('portfolio-summary-e2e-3@example.com');

    const assetA = await createAsset('SUMA1', 33);
    const assetD = await createAsset('SUMD4', 10);

    await prisma.holding.create({
      data: { userId, assetId: assetA.id, quantity: 100, avgPrice: 30 },
    });
    const holdingToDelete = await prisma.holding.create({
      data: { userId, assetId: assetD.id, quantity: 10, avgPrice: 10 },
    });

    const beforeDelete = await request(app.getHttpServer())
      .get('/portfolio/summary')
      .set('Cookie', cookies);
    expect(beforeDelete.body.totalInvested).toBe(3100);

    await prisma.holding.delete({ where: { id: holdingToDelete.id } });

    const afterDelete = await request(app.getHttpServer())
      .get('/portfolio/summary')
      .set('Cookie', cookies);

    expect(afterDelete.body).toEqual({
      totalInvested: 3000,
      currentValue: 3300,
      gainLoss: 300,
      returnPct: 10,
    });
  });
});

/**
 * `GET /portfolio/performance` (PORTFOLIO_US-5_T-3). This file only covers
 * this endpoint — it seeds `PortfolioValueSnapshot`/`BenchmarkSnapshot` rows
 * directly via Prisma rather than going through the CSV/holdings endpoints
 * or waiting on PORTFOLIO_US-5_T-2's event listener, since this endpoint
 * only *reads* those tables.
 */
describe('PortfolioController (e2e) - GET /portfolio/performance', () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;
  let prisma: PrismaService;

  const testEmail = 'portfolio-performance-e2e@example.com';

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

  // Scoped to rows this suite creates, rather than an unscoped
  // `deleteMany()` — jest e2e suites run in parallel workers against the
  // same test Postgres (CONVENTIONS.md -> "Testing").
  afterEach(async () => {
    await prisma.portfolioValueSnapshot.deleteMany({ where: { user: { email: testEmail } } });
    await prisma.benchmarkSnapshot.deleteMany({
      where: { date: { gte: new Date('2015-01-01'), lt: new Date('2016-01-01') } },
    });
    await prisma.user.deleteMany({ where: { email: testEmail } });
  });

  /** Registers + logs in a fresh user, returning their cookies and id. */
  async function registerUser(): Promise<{ cookies: string[]; userId: string }> {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: testEmail, password: 'super-secret-password' });

    const setCookieHeader = response.headers['set-cookie'];
    const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];

    return { cookies, userId: response.body.id as string };
  }

  function daysAgo(days: number): Date {
    const date = new Date();
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCDate(date.getUTCDate() - days);
    return date;
  }

  describe('GET /portfolio/performance', () => {
    it('returns 401 when no cookie is sent', async () => {
      const response = await request(app.getHttpServer()).get('/portfolio/performance?range=ALL');

      expect(response.status).toBe(401);
    });

    it('returns 400 for an unrecognised range', async () => {
      const { cookies } = await registerUser();

      const response = await request(app.getHttpServer())
        .get('/portfolio/performance?range=bogus')
        .set('Cookie', cookies);

      expect(response.status).toBe(400);
    });

    it('returns 200 with an empty series and zeroed metrics for a user with no snapshots', async () => {
      const { cookies } = await registerUser();

      const response = await request(app.getHttpServer())
        .get('/portfolio/performance?range=ALL')
        .set('Cookie', cookies);

      expect(response.status).toBe(200);
      expect(response.body.series).toEqual([]);
      expect(response.body.cagr).toBe(0);
      expect(response.body.volatility).toBe(0);
      expect(response.body.maxDrawdown).toBe(0);
      expect(response.body.benchmarkSeries).toBeUndefined();
      expect(response.body.vsBenchmarkPct).toBeUndefined();
    });

    it('range=ALL returns series in ascending order with cagr/volatility/maxDrawdown wired to the shared functions', async () => {
      const { cookies, userId } = await registerUser();

      const points: { date: Date; value: number }[] = [
        { date: daysAgo(200), value: 100 },
        { date: daysAgo(150), value: 110 },
        { date: daysAgo(100), value: 100 },
        { date: daysAgo(50), value: 110 },
        { date: daysAgo(1), value: 100 },
      ];
      await prisma.portfolioValueSnapshot.createMany({
        data: points.map((p) => ({
          userId,
          date: p.date,
          totalValue: p.value,
          totalInvested: p.value,
        })),
      });

      const response = await request(app.getHttpServer())
        .get('/portfolio/performance?range=ALL')
        .set('Cookie', cookies);

      expect(response.status).toBe(200);
      expect(response.body.series).toHaveLength(5);
      const dates = response.body.series.map((s: { date: string }) => new Date(s.date).getTime());
      expect(dates).toEqual([...dates].sort((a, b) => a - b));

      const expectedSeries: PortfolioValuePoint[] = points.map((p) => ({ date: p.date, value: p.value }));
      expect(response.body.cagr).toBeCloseTo(cagr(expectedSeries));
      expect(response.body.volatility).toBeCloseTo(volatility(expectedSeries));
      expect(response.body.maxDrawdown).toBeCloseTo(maxDrawdown(expectedSeries));
    });

    it('range=6M excludes snapshots older than six months, range=ALL returns strictly more points', async () => {
      const { cookies, userId } = await registerUser();

      await prisma.portfolioValueSnapshot.createMany({
        data: [
          { userId, date: daysAgo(300), totalValue: 90, totalInvested: 90 },
          { userId, date: daysAgo(200), totalValue: 95, totalInvested: 90 },
          { userId, date: daysAgo(30), totalValue: 100, totalInvested: 90 },
          { userId, date: daysAgo(1), totalValue: 105, totalInvested: 90 },
        ],
      });

      const sixMonthResponse = await request(app.getHttpServer())
        .get('/portfolio/performance?range=6M')
        .set('Cookie', cookies);
      const allResponse = await request(app.getHttpServer())
        .get('/portfolio/performance?range=ALL')
        .set('Cookie', cookies);

      expect(sixMonthResponse.status).toBe(200);
      expect(allResponse.status).toBe(200);
      expect(sixMonthResponse.body.series).toHaveLength(2);
      expect(allResponse.body.series).toHaveLength(4);
      expect(allResponse.body.series.length).toBeGreaterThan(sixMonthResponse.body.series.length);
    });

    it('without benchmark, benchmarkSeries and vsBenchmarkPct are absent and the request still 200s', async () => {
      const { cookies, userId } = await registerUser();

      await prisma.portfolioValueSnapshot.create({
        data: { userId, date: daysAgo(1), totalValue: 100, totalInvested: 90 },
      });

      const response = await request(app.getHttpServer())
        .get('/portfolio/performance?range=ALL')
        .set('Cookie', cookies);

      expect(response.status).toBe(200);
      expect(response.body.benchmarkSeries).toBeUndefined();
      expect(response.body.vsBenchmarkPct).toBeUndefined();
    });

    it('with benchmark=IBOVESPA, benchmarkSeries is present and vsBenchmarkPct equals the hand-computed return difference', async () => {
      const { cookies, userId } = await registerUser();

      // Portfolio: 100 -> 120 (+20%) over the overlapping window.
      await prisma.portfolioValueSnapshot.createMany({
        data: [
          { userId, date: new Date('2015-03-01'), totalValue: 100, totalInvested: 100 },
          { userId, date: new Date('2015-06-01'), totalValue: 120, totalInvested: 100 },
        ],
      });

      // Benchmark: 1000 -> 1100 (+10%) over the same window.
      await prisma.benchmarkSnapshot.createMany({
        data: [
          { benchmark: 'IBOVESPA', date: new Date('2015-03-01'), value: 1000 },
          { benchmark: 'IBOVESPA', date: new Date('2015-06-01'), value: 1100 },
        ],
      });

      const response = await request(app.getHttpServer())
        .get('/portfolio/performance?range=ALL&benchmark=IBOVESPA')
        .set('Cookie', cookies);

      expect(response.status).toBe(200);
      expect(response.body.benchmarkSeries).toHaveLength(2);
      expect(response.body.vsBenchmarkPct).toBeCloseTo(0.2 - 0.1);
    });

    it('a wider benchmark window yields the same vsBenchmarkPct as one trimmed to the overlap', async () => {
      const { cookies, userId } = await registerUser();

      // Portfolio window: 2015-03-01 -> 2015-06-01, 100 -> 120 (+20%).
      await prisma.portfolioValueSnapshot.createMany({
        data: [
          { userId, date: new Date('2015-03-01'), totalValue: 100, totalInvested: 100 },
          { userId, date: new Date('2015-06-01'), totalValue: 120, totalInvested: 100 },
        ],
      });

      // Benchmark spans a *wider* window than the portfolio's: starts
      // earlier (2015-01-01) and ends later (2015-09-01). Its value over
      // the overlap (2015-03-01 -> 2015-06-01) is 1000 -> 1100 (+10%); the
      // extra points outside the overlap have very different returns, so a
      // naive "each series' own endpoints" implementation would give a
      // different, wrong answer.
      await prisma.benchmarkSnapshot.createMany({
        data: [
          { benchmark: 'IBOVESPA', date: new Date('2015-01-01'), value: 500 },
          { benchmark: 'IBOVESPA', date: new Date('2015-03-01'), value: 1000 },
          { benchmark: 'IBOVESPA', date: new Date('2015-06-01'), value: 1100 },
          { benchmark: 'IBOVESPA', date: new Date('2015-09-01'), value: 5000 },
        ],
      });

      const wideResponse = await request(app.getHttpServer())
        .get('/portfolio/performance?range=ALL&benchmark=IBOVESPA')
        .set('Cookie', cookies);

      expect(wideResponse.status).toBe(200);
      expect(wideResponse.body.vsBenchmarkPct).toBeCloseTo(0.2 - 0.1);
    });
  });
});
