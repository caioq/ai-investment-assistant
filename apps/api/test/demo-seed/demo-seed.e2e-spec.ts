import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/configure-app';
import { ALLOCATION_BY_VALUES } from '../../src/portfolio/dto/allocation-query.dto';
import { ANTHROPIC_CLIENT } from '../../src/advisor/providers/anthropic-client.interface';
import { PrismaService } from '../../src/prisma/prisma.service';
import { DEMO_FIXTURES, DemoFixtures } from '../../prisma/seed/data';
import { runSeed } from '../../prisma/seed';

process.env.AUTH_THROTTLE_LIMIT = '1000';

const TICKER_PREFIX = 'DSE';
const EMAIL = 'demo-seed-e2e@example.com';

// Unique email and prefixed tickers, so this suite cannot collide with other
// suites sharing the test database (CONVENTIONS.md -> Testing).
function namespaced(): DemoFixtures {
  return {
    ...DEMO_FIXTURES,
    user: { ...DEMO_FIXTURES.user, email: EMAIL },
    assets: DEMO_FIXTURES.assets.map((a) => ({ ...a, ticker: `${TICKER_PREFIX}${a.ticker}` })),
    holdings: DEMO_FIXTURES.holdings.map((h) => ({ ...h, ticker: `${TICKER_PREFIX}${h.ticker}` })),
    wallets: DEMO_FIXTURES.wallets.map((w) => ({
      ...w,
      holdings: w.holdings.map((h) => ({ ...h, ticker: h.ticker && `${TICKER_PREFIX}${h.ticker}` })),
    })),
  };
}

describe('demo seed: runSeed (portfolio and history)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let cookie: string[];
  const fixtures = namespaced();
  const benchmarksPresentBefore = new Set<string>();
  const windowStart = () => new Date(Date.now() - 366 * 24 * 60 * 60 * 1000);

  const anthropicCreate = jest.fn(() => {
    throw new Error('The demo seed must never call the Claude API');
  });

  async function cleanupOwnRows() {
    const user = await prisma.user.findUnique({ where: { email: EMAIL } });
    if (user) {
      await prisma.advisorAnalysis.deleteMany({ where: { userId: user.id } });
      await prisma.advisorReport.deleteMany({ where: { userId: user.id } });
      await prisma.recommendedHolding.deleteMany({ where: { recommendedPortfolio: { userId: user.id } } });
      await prisma.recommendedPortfolio.deleteMany({ where: { userId: user.id } });
      await prisma.importLog.deleteMany({ where: { userId: user.id } });
      await prisma.portfolioValueSnapshot.deleteMany({ where: { userId: user.id } });
      await prisma.holding.deleteMany({ where: { userId: user.id } });
      await prisma.user.delete({ where: { id: user.id } });
    }
    const assets = await prisma.asset.findMany({
      where: { ticker: { startsWith: TICKER_PREFIX } },
      select: { id: true },
    });
    const assetIds = assets.map((a) => a.id);
    await prisma.priceHistory.deleteMany({ where: { assetId: { in: assetIds } } });
    await prisma.asset.deleteMany({ where: { id: { in: assetIds } } });
  }

  beforeAll(async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ANTHROPIC_CLIENT)
      .useValue({ messages: { create: anthropicCreate } })
      .compile();
    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = moduleFixture.get(PrismaService);

    await cleanupOwnRows();
    for (const benchmark of ['IBOVESPA', 'CDI'] as const) {
      const existing = await prisma.benchmarkSnapshot.count({
        where: { benchmark, date: { gte: windowStart() } },
      });
      if (existing > 0) benchmarksPresentBefore.add(benchmark);
    }

    await runSeed(prisma, fixtures);

    await logIn();
  });

  // The user row is recreated when a test re-seeds from scratch, so the
  // cookie's user id goes stale; log in again after that.
  async function logIn() {
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: EMAIL, password: 'Demo1234!' });
    expect(login.status).toBe(200);
    cookie = login.headers['set-cookie'] as unknown as string[];
  }

  afterAll(async () => {
    await cleanupOwnRows();
    for (const benchmark of ['IBOVESPA', 'CDI'] as const) {
      if (!benchmarksPresentBefore.has(benchmark)) {
        await prisma.benchmarkSnapshot.deleteMany({
          where: { benchmark, date: { gte: windowStart() } },
        });
      }
    }
    await app.close();
  });

  it('lets the demo user log in and sets the access_token cookie', () => {
    expect(cookie.some((c) => c.startsWith('access_token='))).toBe(true);
  });

  it.each(['IBOVESPA', 'CDI'])('returns a 1Y performance series with a %s benchmark', async (benchmark) => {
    const res = await request(app.getHttpServer())
      .get(`/portfolio/performance?range=1Y&benchmark=${benchmark}`)
      .set('Cookie', cookie)
      .expect(200);
    expect(res.body.series.length).toBeGreaterThanOrEqual(200);
    expect(res.body.benchmarkSeries.length).toBeGreaterThan(0);
  });

  it.each([...ALLOCATION_BY_VALUES])('returns more than one allocation slice by %s', async (by) => {
    const res = await request(app.getHttpServer())
      .get(`/portfolio/allocation?by=${by}`)
      .set('Cookie', cookie)
      .expect(200);
    expect(res.body.length).toBeGreaterThan(1);
  });

  it('makes the last snapshot equal the sum of quantity times fixture currentPrice', async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { email: EMAIL } });
    const last = await prisma.portfolioValueSnapshot.findFirstOrThrow({
      where: { userId: user.id },
      orderBy: { date: 'desc' },
    });
    const expected = fixtures.holdings.reduce((sum, h) => {
      const asset = fixtures.assets.find((a) => a.ticker === h.ticker)!;
      return sum + h.quantity * asset.currentPrice;
    }, 0);
    expect(Math.abs(last.totalValue - expected)).toBeLessThan(0.01);
  });

  it('never updates existing assets and writes price history only for assets it created', async () => {
    const preTicker = fixtures.assets[0].ticker;
    await cleanupOwnRows();
    const pre = await prisma.asset.create({
      data: { ticker: preTicker, name: 'Pre-existing', sector: 'Custom', currentPrice: 7 },
    });
    try {
      await runSeed(prisma, fixtures);
      const after = await prisma.asset.findUniqueOrThrow({ where: { id: pre.id } });
      expect(after.sector).toBe('Custom');
      expect(after.currentPrice).toBe(7);
      expect(await prisma.priceHistory.count({ where: { assetId: pre.id } })).toBe(0);
      const created = await prisma.asset.findFirstOrThrow({
        where: { ticker: fixtures.assets[1].ticker },
      });
      expect(await prisma.priceHistory.count({ where: { assetId: created.id } })).toBeGreaterThan(200);
    } finally {
      await cleanupOwnRows();
      await runSeed(prisma, fixtures);
      await logIn();
    }
  });

  it('serves the pre-generated analysis without calling the Claude API', async () => {
    const res = await request(app.getHttpServer())
      .get('/advisor/analysis/latest')
      .set('Cookie', cookie)
      .expect(200);
    expect(res.body.model).toBe('demo-seed (pre-generated)');
    expect(res.body.score).toBeGreaterThanOrEqual(0);
    expect(res.body.score).toBeLessThanOrEqual(10);
    expect(res.body.strengths.length).toBeGreaterThan(0);
    expect(anthropicCreate).not.toHaveBeenCalled();
  });

  it('serves all three wallets, with an Overall wallet summing to 100 including a fixed-income line', async () => {
    const res = await request(app.getHttpServer())
      .get('/advisor/recommended-portfolios/latest')
      .set('Cookie', cookie)
      .expect(200);
    expect(res.body.map((w: { walletType: string }) => w.walletType).sort()).toEqual([
      'DIVIDENDS',
      'OVERALL_RECOMMENDED',
      'SMALL_CAPS',
    ]);
    const overall = res.body.find((w: { walletType: string }) => w.walletType === 'OVERALL_RECOMMENDED');
    const sum = overall.holdings.reduce(
      (acc: number, h: { targetWeightPct: number }) => acc + h.targetWeightPct,
      0,
    );
    expect(Math.abs(sum - 100)).toBeLessThan(0.001);
    expect(overall.holdings.filter((h: { assetId: string | null }) => h.assetId === null)).toHaveLength(1);
    const analysis = await request(app.getHttpServer())
      .get('/advisor/analysis/latest')
      .set('Cookie', cookie);
    expect([...analysis.body.recommendedPortfolioIds].sort()).toEqual(
      res.body.map((w: { id: string }) => w.id).sort(),
    );
  });

  it('shows every import on /data-sources so no card reads "Never imported"', async () => {
    const summary = await request(app.getHttpServer())
      .get('/data-sources/summary')
      .set('Cookie', cookie)
      .expect(200);
    expect(summary.body.assets.lastImportAt).not.toBeNull();
    expect(summary.body.holdings.lastImportAt).not.toBeNull();
    expect(summary.body.holdings.count).toBe(fixtures.holdings.length);
    expect(summary.body.wallets).toHaveLength(3);
    // `title` is asserted on the row itself: GET /data-sources/summary still
    // hard-codes it to null (data-sources.service.ts), a gap outside this task.
    expect(summary.body.report.fileName).toBe(fixtures.report.fileName);
    const user = await prisma.user.findUniqueOrThrow({ where: { email: EMAIL } });
    const report = await prisma.advisorReport.findFirstOrThrow({ where: { userId: user.id } });
    expect(report.title).toBe(fixtures.report.title);
    expect(report.publishedAt).not.toBeNull();

    const imports = await request(app.getHttpServer())
      .get('/data-sources/imports?limit=20')
      .set('Cookie', cookie)
      .expect(200);
    const keys = imports.body.map(
      (i: { source: string; walletType: string | null; status: string; records: number }) => {
        expect(i.status).toBe('IMPORTED');
        return `${i.source}:${i.walletType ?? ''}`;
      },
    );
    expect(keys.sort()).toEqual([
      'ASSETS:',
      'HOLDINGS:',
      'REPORT:',
      'WALLET:DIVIDENDS',
      'WALLET:OVERALL_RECOMMENDED',
      'WALLET:SMALL_CAPS',
    ]);
    const records = (source: string) =>
      imports.body.find((i: { source: string }) => i.source === source).records;
    expect(records('ASSETS')).toBe(fixtures.assets.length);
    expect(records('HOLDINGS')).toBe(fixtures.holdings.length);
    expect(records('REPORT')).toBe(1);
  });

  it('is idempotent for its own rows and leaves other users untouched', async () => {
    const other = await prisma.user.create({
      data: { email: 'demo-seed-e2e-other@example.com', passwordHash: 'x' },
    });
    try {
      await prisma.importLog.create({
        data: { userId: other.id, source: 'ASSETS', fileName: 'o.csv', records: 1, status: 'IMPORTED' },
      });
      await runSeed(prisma, fixtures);
      await runSeed(prisma, fixtures);
      const user = await prisma.user.findUniqueOrThrow({ where: { email: EMAIL } });
      const where = { userId: user.id };
      expect(await prisma.advisorReport.count({ where })).toBe(1);
      expect(await prisma.advisorAnalysis.count({ where })).toBe(1);
      expect(await prisma.recommendedPortfolio.count({ where })).toBe(3);
      expect(await prisma.importLog.count({ where })).toBe(6);
      expect(await prisma.importLog.count({ where: { userId: other.id } })).toBe(1);
    } finally {
      await prisma.importLog.deleteMany({ where: { userId: other.id } });
      await prisma.user.delete({ where: { id: other.id } });
    }
  });
});

// DEMO_SEED_US-1_T-2: a dedicated e2e suite proving runSeed's safety
// properties (idempotency, insert-only on global tables, isolation from
// other users) against the real test Postgres. Own email/ticker prefix, kept
// distinct from the suite above so this suite's row-count assertions never
// depend on the other suite's timing. No INestApplication/HTTP layer is
// needed here — every assertion reads straight off Prisma.
describe('demo seed: safety', () => {
  let prisma: PrismaService;

  const TICKER_PREFIX = 'DSS';
  const EMAIL = 'demo-seed-safety-e2e@example.com';
  const OTHER_EMAIL = 'demo-seed-safety-e2e-other@example.com';
  const fixtures: DemoFixtures = {
    ...DEMO_FIXTURES,
    user: { ...DEMO_FIXTURES.user, email: EMAIL },
    assets: DEMO_FIXTURES.assets.map((a) => ({ ...a, ticker: `${TICKER_PREFIX}${a.ticker}` })),
    holdings: DEMO_FIXTURES.holdings.map((h) => ({ ...h, ticker: `${TICKER_PREFIX}${h.ticker}` })),
    wallets: DEMO_FIXTURES.wallets.map((w) => ({
      ...w,
      holdings: w.holdings.map((h) => ({ ...h, ticker: h.ticker && `${TICKER_PREFIX}${h.ticker}` })),
    })),
  };
  // Same "no upper bound" shape as the suite above's `benchmarksPresentBefore`
  // check: real synced history always covers the window, so an older,
  // unrelated fixture (e.g. portfolio.e2e-spec.ts's 2015 rows) never counts.
  const windowStart = () => new Date(Date.now() - 366 * 24 * 60 * 60 * 1000);
  const BENCHMARKS = ['IBOVESPA', 'CDI'] as const;

  // A test in this describe may itself call the real runSeed more than once
  // (idempotency, isolation), which fills the whole benchmark window on its
  // first call whenever the window was empty. Tracking presence per test
  // (rather than once for the whole describe) keeps every test's benchmark
  // side effects fully undone before the next test runs, the same way
  // `cleanupOwnRows` undoes user/asset side effects.
  let benchmarksPresentBeforeTest: Set<(typeof BENCHMARKS)[number]>;

  async function fixtureAssetCount(): Promise<number> {
    return prisma.asset.count({ where: { ticker: { in: fixtures.assets.map((a) => a.ticker) } } });
  }

  async function ownedCounts(userId: string) {
    return Promise.all([
      prisma.holding.count({ where: { userId } }),
      prisma.portfolioValueSnapshot.count({ where: { userId } }),
      prisma.recommendedPortfolio.count({ where: { userId } }),
      prisma.recommendedHolding.count({ where: { recommendedPortfolio: { userId } } }),
      prisma.advisorReport.count({ where: { userId } }),
      prisma.advisorAnalysis.count({ where: { userId } }),
      prisma.importLog.count({ where: { userId } }),
    ]);
  }

  async function cleanupOwnRows() {
    for (const email of [EMAIL, OTHER_EMAIL]) {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) continue;
      await prisma.advisorAnalysis.deleteMany({ where: { userId: user.id } });
      await prisma.advisorReport.deleteMany({ where: { userId: user.id } });
      await prisma.recommendedHolding.deleteMany({ where: { recommendedPortfolio: { userId: user.id } } });
      await prisma.recommendedPortfolio.deleteMany({ where: { userId: user.id } });
      await prisma.importLog.deleteMany({ where: { userId: user.id } });
      await prisma.portfolioValueSnapshot.deleteMany({ where: { userId: user.id } });
      await prisma.holding.deleteMany({ where: { userId: user.id } });
      await prisma.user.delete({ where: { id: user.id } });
    }
    const assets = await prisma.asset.findMany({
      where: { ticker: { startsWith: TICKER_PREFIX } },
      select: { id: true },
    });
    const assetIds = assets.map((a) => a.id);
    await prisma.priceHistory.deleteMany({ where: { assetId: { in: assetIds } } });
    await prisma.asset.deleteMany({ where: { id: { in: assetIds } } });
  }

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    await cleanupOwnRows();
  });

  beforeEach(async () => {
    benchmarksPresentBeforeTest = new Set();
    for (const benchmark of BENCHMARKS) {
      const existing = await prisma.benchmarkSnapshot.count({
        where: { benchmark, date: { gte: windowStart() } },
      });
      if (existing > 0) benchmarksPresentBeforeTest.add(benchmark);
    }
  });

  afterEach(async () => {
    await cleanupOwnRows();
    for (const benchmark of BENCHMARKS) {
      if (!benchmarksPresentBeforeTest.has(benchmark)) {
        await prisma.benchmarkSnapshot.deleteMany({ where: { benchmark, date: { gte: windowStart() } } });
      }
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('idempotency: re-running leaves every demo-owned model and the fixture asset count unchanged', async () => {
    await runSeed(prisma, fixtures);
    const user = await prisma.user.findUniqueOrThrow({ where: { email: EMAIL } });
    const before = await ownedCounts(user.id);
    const assetsBefore = await fixtureAssetCount();

    await runSeed(prisma, fixtures);

    const after = await ownedCounts(user.id);
    const assetsAfter = await fixtureAssetCount();
    expect(after).toEqual(before);
    expect(assetsAfter).toBe(assetsBefore);
  });

  it('insert-only assets: an existing asset keeps its own classification and price, and gets no seeded price history', async () => {
    const ticker = fixtures.assets[0].ticker;
    const pre = await prisma.asset.create({
      data: {
        ticker,
        name: 'Pre-existing custom asset',
        sector: 'Custom Sector',
        currentPrice: 123.45,
        investmentStyle: null,
      },
    });

    await runSeed(prisma, fixtures);

    const after = await prisma.asset.findUniqueOrThrow({ where: { id: pre.id } });
    expect(after.sector).toBe('Custom Sector');
    expect(after.currentPrice).toBe(123.45);
    expect(after.investmentStyle).toBeNull();
    expect(await prisma.priceHistory.count({ where: { assetId: pre.id } })).toBe(0);
  });

  it('insert-only benchmarks: a benchmark with a row already in the seeded window gets no new rows from the seed', async () => {
    const inWindow = { benchmark: 'CDI' as const, date: { gte: windowStart() } };
    // Upsert rather than create: another test in this describe may have
    // already filled the window (e.g. idempotency's own runSeed calls), so a
    // fixed date here could otherwise collide with an existing row instead
    // of exercising the "already has a row in the window" case.
    const fixtureDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000);
    await prisma.benchmarkSnapshot.upsert({
      where: { benchmark_date: { benchmark: 'CDI', date: fixtureDate } },
      create: { benchmark: 'CDI', date: fixtureDate, value: 100 },
      update: { value: 100 },
    });
    const countBeforeSeed = await prisma.benchmarkSnapshot.count({ where: inWindow });

    await runSeed(prisma, fixtures);

    const countAfterSeed = await prisma.benchmarkSnapshot.count({ where: inWindow });
    expect(countAfterSeed).toBe(countBeforeSeed);
  });

  it("isolation: another user's holding, analysis and import log are unchanged after seeding twice", async () => {
    const asset = await prisma.asset.create({
      data: { ticker: `${TICKER_PREFIX}OTHERX`, name: 'Other user asset' },
    });
    const other = await prisma.user.create({ data: { email: OTHER_EMAIL, passwordHash: 'x' } });
    const holding = await prisma.holding.create({
      data: { userId: other.id, assetId: asset.id, quantity: 10, avgPrice: 5 },
    });
    const analysis = await prisma.advisorAnalysis.create({
      data: {
        userId: other.id,
        recommendedPortfolioIds: [],
        score: 5,
        summary: 'Other user analysis',
        strengths: ['x'],
        risks: ['y'],
        recommendations: ['z'],
        impactMetrics: [],
        model: 'test',
      },
    });
    const importLog = await prisma.importLog.create({
      data: { userId: other.id, source: 'ASSETS', fileName: 'other.csv', records: 1, status: 'IMPORTED' },
    });

    await runSeed(prisma, fixtures);
    await runSeed(prisma, fixtures);

    expect(await prisma.holding.findUniqueOrThrow({ where: { id: holding.id } })).toEqual(holding);
    expect(await prisma.advisorAnalysis.findUniqueOrThrow({ where: { id: analysis.id } })).toEqual(analysis);
    expect(await prisma.importLog.findUniqueOrThrow({ where: { id: importLog.id } })).toEqual(importLog);
  });
});
