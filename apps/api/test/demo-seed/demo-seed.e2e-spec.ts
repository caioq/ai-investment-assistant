import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/configure-app';
import { ALLOCATION_BY_VALUES } from '../../src/portfolio/dto/allocation-query.dto';
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
  };
}

describe('demo seed: runSeed (portfolio and history)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let cookie: string[];
  const fixtures = namespaced();
  const benchmarksPresentBefore = new Set<string>();
  const windowStart = () => new Date(Date.now() - 366 * 24 * 60 * 60 * 1000);

  async function cleanupOwnRows() {
    const user = await prisma.user.findUnique({ where: { email: EMAIL } });
    if (user) {
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
    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
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

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: EMAIL, password: 'Demo1234!' });
    expect(login.status).toBe(200);
    cookie = login.headers['set-cookie'] as unknown as string[];
  });

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
    }
  });
});
