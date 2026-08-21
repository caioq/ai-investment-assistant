import { readFileSync } from 'fs';
import { join } from 'path';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { MarketDataService } from '../src/market-data/market-data.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { RecommendedPortfolio, WalletType } from '../generated/prisma/client';

/**
 * RECOMMENDED_PORTFOLIOS_US-1_T-6 — `POST /advisor/recommended-portfolios/upload`.
 *
 * Full-app e2e per CONVENTIONS.md -> "Testing": `Test.createTestingModule`
 * with the real `AppModule`, `configureApp(app)` before `.init()` so the
 * cookie-guarded route actually works, and the fixtures from
 * RECOMMENDED_PORTFOLIOS_SHARED_T-3 uploaded through supertest's `.attach()`
 * rather than calling the service directly — this is what proves the whole
 * HTTP path (multipart parsing, query/body DTO validation, the
 * `AuthGuard`), not just the service layer already covered by
 * `recommended-portfolios.service.spec.ts`.
 */

const FIXTURE_DIR = join(__dirname, 'fixtures', 'recommended-portfolios');

function readFixture(name: string): string {
  return readFileSync(join(FIXTURE_DIR, name), 'utf8');
}

// Namespaced to this suite (per CONVENTIONS.md -> "Testing" — e2e suites run
// in parallel against one test Postgres, and reusing another suite's ticker
// makes the two suites delete each other's rows). Matches every `CODIGO`
// across the three fixtures (see their own README.md).
const SUITE_TICKERS = [
  'RPFA3',
  'RPFB4',
  'RPFC3',
  'RPFD11',
  'RPFE3',
  'RPDA3',
  'RPDB4',
  'RPDC4',
  'RPDD3',
  'RPSA3',
  'RPSB4',
  'RPSC3',
  'RPSD11',
];

const SUITE_EMAILS = [
  'recommended-portfolios-e2e-1@example.com',
  'recommended-portfolios-e2e-2@example.com',
  'recommended-portfolios-e2e-3@example.com',
  'recommended-portfolios-e2e-4@example.com',
  'recommended-portfolios-e2e-5@example.com',
  'recommended-portfolios-e2e-6@example.com',
  'recommended-portfolios-e2e-7@example.com',
];

describe('RecommendedPortfoliosController (e2e) - POST /advisor/recommended-portfolios/upload', () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;
  let prisma: PrismaService;

  // Stubs `MarketDataService.backfillHistory` so nothing reaches live Yahoo
  // Finance (CONVENTIONS.md -> "Testing"). `findOrCreateAsset`
  // (RECOMMENDED_PORTFOLIOS_US-1_T-5/T-6) is exercised for real below — it
  // only touches the real `PrismaService` this suite already uses — via
  // `jest.spyOn` on the real DI instance, same pattern as
  // `portfolio.e2e-spec.ts`'s upload-csv suite.
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
  // (CONVENTIONS.md -> "Testing"). `recommendedPortfolio` is deleted first —
  // its `holdings` cascade (`onDelete: Cascade`) — so the `asset` delete that
  // follows isn't blocked by a still-referencing `RecommendedHolding.assetId`.
  afterEach(async () => {
    await prisma.recommendedPortfolio.deleteMany({
      where: { user: { email: { in: SUITE_EMAILS } } },
    });
    await prisma.asset.deleteMany({ where: { ticker: { in: SUITE_TICKERS } } });
    await prisma.user.deleteMany({ where: { email: { in: SUITE_EMAILS } } });
  });

  /** Registers a user, returning the `access_token` cookie array (register
   * itself sets the cookie — see `auth.e2e-spec.ts`). */
  async function authCookies(email: string): Promise<string[]> {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'super-secret-password' });

    const setCookieHeader = response.headers['set-cookie'];
    return Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  }

  function uploadRequest(cookies: string[], wallet: string) {
    return request(app.getHttpServer())
      .post('/advisor/recommended-portfolios/upload')
      .set('Cookie', cookies)
      .query({ wallet });
  }

  it(
    'spec AC-1/AC-2/AC-9: uploading the real Overall Recommended export persists every row, ' +
      'the tickerless row lands with assetId: null, and a not-yet-seen ticker creates its Asset ' +
      'and links it on the holding',
    async () => {
      const cookies = await authCookies(SUITE_EMAILS[0]);

      const response = await uploadRequest(cookies, 'OVERALL_RECOMMENDED').attach(
        'file',
        Buffer.from(readFixture('overall-recommended.csv'), 'utf-8'),
        'overall-recommended.csv',
      );

      expect(response.status).toBe(200);
      expect(response.body.walletType).toBe('OVERALL_RECOMMENDED');
      expect(response.body.holdings).toHaveLength(6);

      // AC-2: Overall's rows carry targetWeightPct.
      for (const holding of response.body.holdings) {
        expect(holding.targetWeightPct).not.toBeNull();
      }

      // AC-1: the tickerless "Renda Fixa - LFT Tesouro" row is not dropped.
      const tickerless = response.body.holdings.find(
        (h: { label: string }) => h.label === 'Renda Fixa - LFT Tesouro',
      );
      expect(tickerless).toBeDefined();
      expect(tickerless.assetId).toBeNull();
      expect(tickerless.targetWeightPct).toBe(15);

      // AC-9: a ticker not previously seen (RPFA3) created its Asset, and the
      // join is real — not merely that some Asset row now exists.
      const rpfa3Holding = response.body.holdings.find(
        (h: { limitPrice: number }) => h.limitPrice === 52,
      );
      expect(rpfa3Holding.assetId).not.toBeNull();

      const asset = await prisma.asset.findUnique({ where: { id: rpfa3Holding.assetId } });
      expect(asset?.ticker).toBe('RPFA3');
    },
  );

  it('spec AC-2: after uploading Dividends or Small Caps, every row has targetWeightPct: null (not 0)', async () => {
    const cookies = await authCookies(SUITE_EMAILS[1]);

    const dividendsResponse = await uploadRequest(cookies, 'DIVIDENDS').attach(
      'file',
      Buffer.from(readFixture('dividends.csv'), 'utf-8'),
      'dividends.csv',
    );
    expect(dividendsResponse.status).toBe(200);
    for (const holding of dividendsResponse.body.holdings) {
      expect(holding.targetWeightPct).toBeNull();
    }

    const smallCapsResponse = await uploadRequest(cookies, 'SMALL_CAPS').attach(
      'file',
      Buffer.from(readFixture('small-caps.csv'), 'utf-8'),
      'small-caps.csv',
    );
    expect(smallCapsResponse.status).toBe(200);
    for (const holding of smallCapsResponse.body.holdings) {
      expect(holding.targetWeightPct).toBeNull();
    }
  });

  it('spec AC-7: no Asset touched by any of the three wallets gets a riskRating or sector', async () => {
    const cookies = await authCookies(SUITE_EMAILS[2]);

    await uploadRequest(cookies, 'OVERALL_RECOMMENDED')
      .attach('file', Buffer.from(readFixture('overall-recommended.csv'), 'utf-8'), 'overall.csv')
      .expect(200);
    await uploadRequest(cookies, 'DIVIDENDS')
      .attach('file', Buffer.from(readFixture('dividends.csv'), 'utf-8'), 'dividends.csv')
      .expect(200);
    await uploadRequest(cookies, 'SMALL_CAPS')
      .attach('file', Buffer.from(readFixture('small-caps.csv'), 'utf-8'), 'small-caps.csv')
      .expect(200);

    const assets = await prisma.asset.findMany({ where: { ticker: { in: SUITE_TICKERS } } });
    expect(assets.length).toBeGreaterThan(0);
    for (const asset of assets) {
      expect(asset.riskRating).toBeNull();
      expect(asset.sector).toBeNull();
    }
  });

  it('spec AC-8, end-to-end: a targetWeightPct of 150% rejects the whole upload with 400 and persists nothing', async () => {
    const cookies = await authCookies(SUITE_EMAILS[3]);

    const badCsv = readFixture('overall-recommended.csv').replace('"25,00%"', '"150,00%"');

    const response = await uploadRequest(cookies, 'OVERALL_RECOMMENDED').attach(
      'file',
      Buffer.from(badCsv, 'utf-8'),
      'overall-recommended.csv',
    );

    expect(response.status).toBe(400);

    const portfolios = await prisma.recommendedPortfolio.findMany({
      where: { user: { email: SUITE_EMAILS[3] } },
    });
    expect(portfolios).toHaveLength(0);
  });

  it('returns 400 for an unrecognised ?wallet= value', async () => {
    const cookies = await authCookies(SUITE_EMAILS[0]);

    const response = await uploadRequest(cookies, 'BOGUS').attach(
      'file',
      Buffer.from(readFixture('overall-recommended.csv'), 'utf-8'),
      'overall-recommended.csv',
    );

    expect(response.status).toBe(400);
  });

  it('returns 400, not 500, when no file is attached', async () => {
    const cookies = await authCookies(SUITE_EMAILS[0]);

    const response = await uploadRequest(cookies, 'OVERALL_RECOMMENDED');

    expect(response.status).toBe(400);
  });

  it('defaults effectiveDate to today at UTC midnight when omitted, and uses a supplied one otherwise', async () => {
    const cookies = await authCookies(SUITE_EMAILS[0]);

    const now = new Date();
    const today = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    ).toISOString();

    const defaultedResponse = await uploadRequest(cookies, 'SMALL_CAPS').attach(
      'file',
      Buffer.from(readFixture('small-caps.csv'), 'utf-8'),
      'small-caps.csv',
    );
    expect(defaultedResponse.status).toBe(200);
    expect(defaultedResponse.body.effectiveDate).toBe(today);

    const explicitResponse = await request(app.getHttpServer())
      .post('/advisor/recommended-portfolios/upload')
      .set('Cookie', cookies)
      .query({ wallet: 'DIVIDENDS' })
      .field('effectiveDate', '2020-05-01')
      .field('sourceName', 'XP')
      .attach('file', Buffer.from(readFixture('dividends.csv'), 'utf-8'), 'dividends.csv');

    expect(explicitResponse.status).toBe(200);
    expect(explicitResponse.body.effectiveDate).toBe('2020-05-01T00:00:00.000Z');
    expect(explicitResponse.body.sourceName).toBe('XP');
  });

  it('returns 401 when no auth cookie is sent', async () => {
    const response = await request(app.getHttpServer())
      .post('/advisor/recommended-portfolios/upload')
      .query({ wallet: 'OVERALL_RECOMMENDED' })
      .attach('file', Buffer.from(readFixture('overall-recommended.csv'), 'utf-8'), 'overall.csv');

    expect(response.status).toBe(401);
  });

  /**
   * RECOMMENDED_PORTFOLIOS_US-2_T-1 — pins the version-history guarantee
   * itself (spec Behavior Notes: "Uploading never deletes or mutates a
   * prior RecommendedPortfolio"; AC-10/AC-11), rather than inferring it from
   * `GET .../latest` happening to return the right row. `GET .../latest`
   * isn't implemented yet (that's a later task), so these read straight from
   * `PrismaService` — the same escape hatch every other test in this file
   * already uses to verify persisted state beyond the upload response body.
   *
   * The failure mode this guards against is an upsert keyed on
   * `(userId, walletType)` or `(walletType, effectiveDate)` — either looks
   * correct, passes every US-1 upload test, and silently overwrites a prior
   * snapshot. A row-count assertion alone would pass an implementation that
   * adds a row *and* mutates the old one, so case 1 below also varies a
   * value (PRECO_TETO/RECOMENDACAO) between the two uploads and asserts the
   * first snapshot kept its original values.
   */
  describe('additive history (RECOMMENDED_PORTFOLIOS_US-2_T-1)', () => {
    it(
      'spec AC-10: uploading DIVIDENDS twice with different effectiveDates leaves exactly 2 rows, ' +
        'and the first snapshot is untouched by the second upload',
      async () => {
        const cookies = await authCookies(SUITE_EMAILS[4]);

        const firstResponse = await request(app.getHttpServer())
          .post('/advisor/recommended-portfolios/upload')
          .set('Cookie', cookies)
          .query({ wallet: 'DIVIDENDS' })
          .field('effectiveDate', '2024-01-01')
          .attach('file', Buffer.from(readFixture('dividends.csv'), 'utf-8'), 'dividends.csv');
        expect(firstResponse.status).toBe(200);

        const firstAlfaHolding = firstResponse.body.holdings.find(
          (h: { label: string }) => h.label === 'Alfa Energia Participacoes',
        );
        expect(firstAlfaHolding.limitPrice).toBe(50);
        expect(firstAlfaHolding.recommendation).toBe('BUY');

        // Vary PRECO_TETO and RECOMENDACAO for the same row between uploads,
        // per the task's "Test" note — a row-count assertion alone can't
        // distinguish "added a row" from "added a row and mutated the old one".
        const modifiedCsv = readFixture('dividends.csv')
          .replace('"R$ 50,00"', '"R$ 99,00"')
          .replace(',RPDA3,COMPRA,', ',RPDA3,VENDA,');

        const secondResponse = await request(app.getHttpServer())
          .post('/advisor/recommended-portfolios/upload')
          .set('Cookie', cookies)
          .query({ wallet: 'DIVIDENDS' })
          .field('effectiveDate', '2024-02-01')
          .attach('file', Buffer.from(modifiedCsv, 'utf-8'), 'dividends-modified.csv');
        expect(secondResponse.status).toBe(200);

        const portfolios = await prisma.recommendedPortfolio.findMany({
          where: { user: { email: SUITE_EMAILS[4] }, walletType: 'DIVIDENDS' },
          include: { holdings: true },
        });
        expect(portfolios).toHaveLength(2);

        const firstPortfolio = portfolios.find((p) => p.id === firstResponse.body.id);
        expect(firstPortfolio).toBeDefined();
        expect(firstPortfolio!.effectiveDate.toISOString()).toBe('2024-01-01T00:00:00.000Z');

        const untouchedAlfaHolding = firstPortfolio!.holdings.find(
          (h) => h.label === 'Alfa Energia Participacoes',
        );
        expect(untouchedAlfaHolding?.limitPrice).toBe(50);
        expect(untouchedAlfaHolding?.recommendation).toBe('BUY');
      },
    );

    it('spec AC-11: uploading DIVIDENDS twice with the same effectiveDate also yields 2 rows', async () => {
      const cookies = await authCookies(SUITE_EMAILS[5]);

      const firstResponse = await request(app.getHttpServer())
        .post('/advisor/recommended-portfolios/upload')
        .set('Cookie', cookies)
        .query({ wallet: 'DIVIDENDS' })
        .field('effectiveDate', '2024-03-01')
        .attach('file', Buffer.from(readFixture('dividends.csv'), 'utf-8'), 'dividends.csv');
      expect(firstResponse.status).toBe(200);

      const secondResponse = await request(app.getHttpServer())
        .post('/advisor/recommended-portfolios/upload')
        .set('Cookie', cookies)
        .query({ wallet: 'DIVIDENDS' })
        .field('effectiveDate', '2024-03-01')
        .attach('file', Buffer.from(readFixture('dividends.csv'), 'utf-8'), 'dividends.csv');
      expect(secondResponse.status).toBe(200);
      expect(secondResponse.body.id).not.toBe(firstResponse.body.id);

      const portfolios = await prisma.recommendedPortfolio.findMany({
        where: { user: { email: SUITE_EMAILS[5] }, walletType: 'DIVIDENDS' },
      });
      expect(portfolios).toHaveLength(2);
    });

    it('uploading a different wallet type leaves the DIVIDENDS snapshots untouched', async () => {
      const cookies = await authCookies(SUITE_EMAILS[6]);

      await request(app.getHttpServer())
        .post('/advisor/recommended-portfolios/upload')
        .set('Cookie', cookies)
        .query({ wallet: 'DIVIDENDS' })
        .field('effectiveDate', '2024-04-01')
        .attach('file', Buffer.from(readFixture('dividends.csv'), 'utf-8'), 'dividends.csv')
        .expect(200);
      await request(app.getHttpServer())
        .post('/advisor/recommended-portfolios/upload')
        .set('Cookie', cookies)
        .query({ wallet: 'DIVIDENDS' })
        .field('effectiveDate', '2024-05-01')
        .attach('file', Buffer.from(readFixture('dividends.csv'), 'utf-8'), 'dividends.csv')
        .expect(200);

      const dividendsBefore = await prisma.recommendedPortfolio.findMany({
        where: { user: { email: SUITE_EMAILS[6] }, walletType: 'DIVIDENDS' },
      });
      expect(dividendsBefore).toHaveLength(2);

      await request(app.getHttpServer())
        .post('/advisor/recommended-portfolios/upload')
        .set('Cookie', cookies)
        .query({ wallet: 'SMALL_CAPS' })
        .attach('file', Buffer.from(readFixture('small-caps.csv'), 'utf-8'), 'small-caps.csv')
        .expect(200);

      const dividendsAfter = await prisma.recommendedPortfolio.findMany({
        where: { user: { email: SUITE_EMAILS[6] }, walletType: 'DIVIDENDS' },
        include: { holdings: true },
      });
      expect(dividendsAfter).toHaveLength(2);
      expect(new Set(dividendsAfter.map((p) => p.id))).toEqual(
        new Set(dividendsBefore.map((p) => p.id)),
      );
    });
  });
});

/**
 * RECOMMENDED_PORTFOLIOS_US-3_T-1 — `GET /advisor/recommended-portfolios/latest`.
 *
 * Full-app e2e per CONVENTIONS.md -> "Testing". Unlike the upload suite
 * (RECOMMENDED_PORTFOLIOS_US-1_T-6), this endpoint only reads snapshots, so
 * fixtures are seeded **directly via Prisma** rather than through the
 * upload path — the task's own `Test:` field calls this out explicitly:
 * this endpoint's behaviour must not depend on the upload path working.
 */

// Namespaced to this suite (per CONVENTIONS.md -> "Testing" — e2e suites run
// in parallel against one test Postgres, and reusing another suite's fixture
// values makes the two suites delete each other's rows).
const LATEST_SUITE_EMAILS = [
  'recommended-portfolios-latest-e2e-a@example.com',
  'recommended-portfolios-latest-e2e-b@example.com',
  'recommended-portfolios-latest-e2e-c@example.com',
  'recommended-portfolios-latest-e2e-d@example.com',
  'recommended-portfolios-latest-e2e-e@example.com',
  'recommended-portfolios-latest-e2e-f@example.com',
  'recommended-portfolios-latest-e2e-g@example.com',
];

describe('RecommendedPortfoliosController (e2e) - GET /advisor/recommended-portfolios/latest', () => {
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
  // (CONVENTIONS.md -> "Testing"). `recommendedPortfolio` is deleted first —
  // its `holdings` cascade (`onDelete: Cascade`) — before the owning `user`
  // rows are removed.
  afterEach(async () => {
    await prisma.recommendedPortfolio.deleteMany({
      where: { user: { email: { in: LATEST_SUITE_EMAILS } } },
    });
    await prisma.user.deleteMany({ where: { email: { in: LATEST_SUITE_EMAILS } } });
  });

  /** Registers a user, returning the `access_token` cookie array (register
   * itself sets the cookie — see `auth.e2e-spec.ts`). */
  async function authCookies(email: string): Promise<string[]> {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'super-secret-password' });

    const setCookieHeader = response.headers['set-cookie'];
    return Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  }

  /** Seeds one `RecommendedPortfolio` + a single `RecommendedHolding`
   * directly via Prisma — this endpoint reads snapshots and must not depend
   * on the upload path working. `assetId: null` keeps fixtures self
   * contained (no `Asset` row needed) — `RecommendedHolding.label` is
   * always present regardless. */
  async function seedPortfolio(
    userId: string,
    walletType: WalletType,
    effectiveDate: string,
    uploadedAt: Date,
    label: string,
  ): Promise<RecommendedPortfolio> {
    return prisma.recommendedPortfolio.create({
      data: {
        userId,
        walletType,
        effectiveDate: new Date(effectiveDate),
        uploadedAt,
        holdings: {
          create: [{ label, assetId: null }],
        },
      },
    });
  }

  function getLatest(cookies: string[]) {
    return request(app.getHttpServer())
      .get('/advisor/recommended-portfolios/latest')
      .set('Cookie', cookies);
  }

  it('spec AC-10: two DIVIDENDS snapshots with different effectiveDates - only the newer one comes back, with holdings', async () => {
    const cookies = await authCookies(LATEST_SUITE_EMAILS[0]);
    const user = await prisma.user.findUniqueOrThrow({ where: { email: LATEST_SUITE_EMAILS[0] } });

    await seedPortfolio(
      user.id,
      'DIVIDENDS',
      '2026-08-01',
      new Date('2026-08-01T10:00:00Z'),
      'Older',
    );
    const newer = await seedPortfolio(
      user.id,
      'DIVIDENDS',
      '2026-08-15',
      new Date('2026-08-15T10:00:00Z'),
      'Newer',
    );

    const response = await getLatest(cookies);

    expect(response.status).toBe(200);
    const dividendsEntries = response.body.filter(
      (entry: { walletType: string }) => entry.walletType === 'DIVIDENDS',
    );
    expect(dividendsEntries).toHaveLength(1);
    expect(dividendsEntries[0].id).toBe(newer.id);
    expect(dividendsEntries[0].holdings).toHaveLength(1);
    expect(dividendsEntries[0].holdings[0].label).toBe('Newer');
  });

  it('spec AC-12: 3/2/1 versions across the three wallet types - exactly 3 entries, one per type', async () => {
    const cookies = await authCookies(LATEST_SUITE_EMAILS[1]);
    const user = await prisma.user.findUniqueOrThrow({ where: { email: LATEST_SUITE_EMAILS[1] } });

    // 3 DIVIDENDS versions - a "take the first 3 by effectiveDate"
    // implementation would return all three of these and nothing else.
    await seedPortfolio(user.id, 'DIVIDENDS', '2026-08-01', new Date('2026-08-01T10:00:00Z'), 'D1');
    await seedPortfolio(user.id, 'DIVIDENDS', '2026-08-02', new Date('2026-08-02T10:00:00Z'), 'D2');
    const dividendsLatest = await seedPortfolio(
      user.id,
      'DIVIDENDS',
      '2026-08-03',
      new Date('2026-08-03T10:00:00Z'),
      'D3',
    );

    // 2 OVERALL_RECOMMENDED versions.
    await seedPortfolio(
      user.id,
      'OVERALL_RECOMMENDED',
      '2026-08-01',
      new Date('2026-08-01T10:00:00Z'),
      'O1',
    );
    const overallLatest = await seedPortfolio(
      user.id,
      'OVERALL_RECOMMENDED',
      '2026-08-02',
      new Date('2026-08-02T10:00:00Z'),
      'O2',
    );

    // 1 SMALL_CAPS version.
    const smallCapsLatest = await seedPortfolio(
      user.id,
      'SMALL_CAPS',
      '2026-08-01',
      new Date('2026-08-01T10:00:00Z'),
      'S1',
    );

    const response = await getLatest(cookies);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(3);

    const byType = new Map(
      response.body.map((entry: { walletType: string; id: string }) => [
        entry.walletType,
        entry.id,
      ]),
    );
    expect(byType.get('DIVIDENDS')).toBe(dividendsLatest.id);
    expect(byType.get('OVERALL_RECOMMENDED')).toBe(overallLatest.id);
    expect(byType.get('SMALL_CAPS')).toBe(smallCapsLatest.id);
  });

  it('spec AC-11: two DIVIDENDS snapshots sharing effectiveDate but differing uploadedAt - the later-uploaded one wins', async () => {
    const cookies = await authCookies(LATEST_SUITE_EMAILS[2]);
    const user = await prisma.user.findUniqueOrThrow({ where: { email: LATEST_SUITE_EMAILS[2] } });

    await seedPortfolio(
      user.id,
      'DIVIDENDS',
      '2026-08-10',
      new Date('2026-08-10T08:00:00Z'),
      'First upload',
    );
    const laterUpload = await seedPortfolio(
      user.id,
      'DIVIDENDS',
      '2026-08-10',
      new Date('2026-08-10T18:00:00Z'),
      'Corrected upload',
    );

    const response = await getLatest(cookies);

    expect(response.status).toBe(200);
    const dividendsEntries = response.body.filter(
      (entry: { walletType: string }) => entry.walletType === 'DIVIDENDS',
    );
    expect(dividendsEntries).toHaveLength(1);
    expect(dividendsEntries[0].id).toBe(laterUpload.id);
  });

  it('a wallet type with no uploads is absent from the response, not present with a null payload', async () => {
    const cookies = await authCookies(LATEST_SUITE_EMAILS[3]);
    const user = await prisma.user.findUniqueOrThrow({ where: { email: LATEST_SUITE_EMAILS[3] } });

    await seedPortfolio(user.id, 'DIVIDENDS', '2026-08-01', new Date('2026-08-01T10:00:00Z'), 'D1');

    const response = await getLatest(cookies);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body.every((entry: unknown) => entry !== null)).toBe(true);
    expect(
      response.body.some((entry: { walletType: string }) => entry.walletType === 'SMALL_CAPS'),
    ).toBe(false);
  });

  it('a user with no snapshots gets 200 and []', async () => {
    const cookies = await authCookies(LATEST_SUITE_EMAILS[4]);

    const response = await getLatest(cookies);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it("snapshots belonging to another user never appear in this user's response", async () => {
    const cookiesA = await authCookies(LATEST_SUITE_EMAILS[5]);
    const userB = await prisma.user.create({
      data: { email: LATEST_SUITE_EMAILS[6], passwordHash: 'not-a-real-hash' },
    });

    await seedPortfolio(
      userB.id,
      'DIVIDENDS',
      '2026-08-01',
      new Date('2026-08-01T10:00:00Z'),
      'B1',
    );

    const response = await getLatest(cookiesA);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it('returns 401 when no auth cookie is sent', async () => {
    const response = await request(app.getHttpServer()).get(
      '/advisor/recommended-portfolios/latest',
    );

    expect(response.status).toBe(401);
  });
});
