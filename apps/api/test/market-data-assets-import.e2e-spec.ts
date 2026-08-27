import { readFileSync } from 'fs';
import { join } from 'path';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { MarketDataService } from '../src/market-data/market-data.service';
import { PRICE_PROVIDER, PriceProvider } from '../src/market-data/providers/price-provider.interface';
import { PrismaService } from '../src/prisma/prisma.service';

const FIXTURE_DIR = join(__dirname, 'fixtures', 'market-data');

function readFixture(name: string): string {
  return readFileSync(join(FIXTURE_DIR, name), 'utf8');
}

/**
 * Tickers namespaced to this suite (MARKET_DATA_US-5_T-1's fixtures), per
 * CONVENTIONS.md -> "Testing": e2e suites run in parallel against one test
 * Postgres, so `afterEach` is scoped to exactly these rather than an
 * unscoped `deleteMany()`.
 */
const MDAS_TICKERS = [
  'MDAS1',
  'MDAS2',
  'MDAS3',
  'MDAS4',
  'MDAS5',
  'MDAS6',
  'MDAS7',
  'MDAS8',
  'MDAS9',
];

describe('MarketDataService.importAssetsCsv (e2e)', () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;
  let prisma: PrismaService;
  let marketDataService: MarketDataService;

  // Stubs the upstream Yahoo Finance call (CONVENTIONS.md -> "Testing",
  // same pattern as market-data.e2e-spec.ts) for point (8)'s
  // `refreshAllQuotes()` case. Only answers for this suite's own tickers so
  // it can't interfere with other Asset rows a concurrent suite might have
  // in the shared test Postgres at the same moment (refreshAllQuotes()
  // fetches every Asset row, not just this suite's).
  const priceProviderStub: PriceProvider = {
    getQuote: jest.fn(async (tickers: string[]) =>
      tickers
        .filter((ticker) => MDAS_TICKERS.includes(ticker))
        .map((ticker) => ({ ticker, price: 42.5, changePct: 1.1 })),
    ),
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
    await app.init();

    prisma = moduleFixture.get(PrismaService);
    marketDataService = moduleFixture.get(MarketDataService);
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(async () => {
    // (8) exercises refreshAllQuotes(), which upserts a PriceHistory row per
    // asset — deleted first, since Asset.deleteMany would otherwise violate
    // price_history's FK to assets.
    await prisma.priceHistory.deleteMany({ where: { asset: { ticker: { in: MDAS_TICKERS } } } });
    await prisma.asset.deleteMany({ where: { ticker: { in: MDAS_TICKERS } } });
  });

  it(
    'creates assets from a full import, skips the empty-ticker row, stores ETF ' +
      'investmentStyle, and correctly distinguishes overwrite / absent-column / empty-cell on re-import',
    async () => {
      // (1) Importing assets-full.csv into an empty table creates one Asset
      // per non-empty-ticker row (MDAS1..MDAS5 — 5 rows, not 6), all four
      // classification fields stored, `created` equal to that count and
      // `errors` empty. MDAS5 has no Holding and no RecommendedHolding —
      // the spec AC no other upload path can satisfy.
      const fullResult = await marketDataService.importAssetsCsv(readFixture('assets-full.csv'));

      expect(fullResult.created).toBe(5);
      expect(fullResult.updated).toBe(0);
      expect(fullResult.errors).toEqual([]);

      const afterFull = await prisma.asset.findMany({
        where: { ticker: { in: MDAS_TICKERS } },
      });
      // (2) The empty-ticker row (`,NOTES,,,,`) produced neither an Asset
      // nor an errors[] entry.
      expect(afterFull).toHaveLength(5);

      const mdas1AfterFull = afterFull.find((asset) => asset.ticker === 'MDAS1')!;
      expect(mdas1AfterFull).toMatchObject({
        sector: 'FINANCIAL',
        subSector: 'BANCOS',
        investmentStyle: 'DIVIDENDS',
        riskRating: 'A',
        assetType: 'EQUITY',
      });

      // (3) The ETF row (MDAS4) stored investmentStyle: ETF.
      const mdas4AfterFull = afterFull.find((asset) => asset.ticker === 'MDAS4')!;
      expect(mdas4AfterFull.investmentStyle).toBe('ETF');

      const mdas5AfterFull = afterFull.find((asset) => asset.ticker === 'MDAS5')!;
      expect(mdas5AfterFull).toMatchObject({
        sector: 'CONSUMER',
        subSector: 'VAREJO',
        investmentStyle: 'MICRO_CAP',
        riskRating: 'A',
      });

      // (4) Re-importing assets-full.csv again is a no-op on `created` (all
      // 5 tickers already exist), so it must report them under `updated`.
      // Change MDAS1's riskRating first so the re-import round-trips a real
      // value change, not just a passthrough.
      await prisma.asset.update({ where: { ticker: 'MDAS1' }, data: { riskRating: 'B' } });

      const reimportResult = await marketDataService.importAssetsCsv(
        readFixture('assets-full.csv'),
      );

      expect(reimportResult.created).toBe(0);
      expect(reimportResult.updated).toBe(5);
      expect(reimportResult.errors).toEqual([]);

      const mdas1AfterReimport = await prisma.asset.findUniqueOrThrow({
        where: { ticker: 'MDAS1' },
      });
      // assets-full.csv's own MDAS1 riskRating (A) overwrote the B set above.
      expect(mdas1AfterReimport.riskRating).toBe('A');

      // (5) Importing assets-partial.csv (header: ticker,sector only)
      // afterwards leaves investmentStyle/riskRating/assetType at their
      // previously stored values — an absent column must not clear them.
      const partialResult = await marketDataService.importAssetsCsv(
        readFixture('assets-partial.csv'),
      );

      expect(partialResult.created).toBe(0);
      expect(partialResult.updated).toBe(2);
      expect(partialResult.errors).toEqual([]);

      const mdas1AfterPartial = await prisma.asset.findUniqueOrThrow({
        where: { ticker: 'MDAS1' },
      });
      expect(mdas1AfterPartial.sector).toBe('FINANCIAL SERVICES');
      expect(mdas1AfterPartial.investmentStyle).toBe('DIVIDENDS');
      expect(mdas1AfterPartial.riskRating).toBe('A');
      expect(mdas1AfterPartial.assetType).toBe('EQUITY');

      // (6) Importing assets-empty-cells.csv (riskRating column present but
      // empty for MDAS1) clears riskRating to null — the other half of the
      // absent-vs-empty pair (5) exercises.
      const emptyCellsResult = await marketDataService.importAssetsCsv(
        readFixture('assets-empty-cells.csv'),
      );

      expect(emptyCellsResult.created).toBe(0);
      expect(emptyCellsResult.updated).toBe(5);
      expect(emptyCellsResult.errors).toEqual([]);

      const mdas1AfterEmptyCells = await prisma.asset.findUniqueOrThrow({
        where: { ticker: 'MDAS1' },
      });
      expect(mdas1AfterEmptyCells.riskRating).toBeNull();
      // The rest of that row's columns are present and non-empty, so they
      // remain set — only riskRating cleared.
      expect(mdas1AfterEmptyCells.sector).toBe('FINANCIAL');
      expect(mdas1AfterEmptyCells.investmentStyle).toBe('DIVIDENDS');
    },
  );

  it(
    '(7) reports unrecognised enum values in errors[] naming rows and reasons, still imports ' +
      'the valid rows, and leaves the bad rows pre-existing classification unchanged',
    async () => {
      // Seed MDAS7/MDAS8 with pre-existing classification so "leaves it
      // unchanged" is actually observable, rather than vacuously true for a
      // brand-new ticker.
      await prisma.asset.create({
        data: { ticker: 'MDAS7', name: 'MDAS7', sector: 'PRE_EXISTING', riskRating: 'AAA' },
      });
      await prisma.asset.create({
        data: {
          ticker: 'MDAS8',
          name: 'MDAS8',
          sector: 'PRE_EXISTING',
          investmentStyle: 'VALUE_INVESTING',
        },
      });

      const result = await marketDataService.importAssetsCsv(readFixture('assets-bad-values.csv'));

      // MDAS6 and MDAS9 are valid, brand-new rows; MDAS7 (riskRating "Z")
      // and MDAS8 (investmentStyle "DIVIDENDOS") are not.
      expect(result.created).toBe(2); // MDAS6, MDAS9
      expect(result.updated).toBe(0);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]).toMatch(/row 2/);
      expect(result.errors[0]).toMatch(/riskRating/);
      expect(result.errors[0]).toMatch(/Z/);
      expect(result.errors[1]).toMatch(/row 3/);
      expect(result.errors[1]).toMatch(/investmentStyle/);
      expect(result.errors[1]).toMatch(/DIVIDENDOS/);

      const mdas7 = await prisma.asset.findUniqueOrThrow({ where: { ticker: 'MDAS7' } });
      expect(mdas7.sector).toBe('PRE_EXISTING');
      expect(mdas7.riskRating).toBe('AAA');

      const mdas8 = await prisma.asset.findUniqueOrThrow({ where: { ticker: 'MDAS8' } });
      expect(mdas8.sector).toBe('PRE_EXISTING');
      expect(mdas8.investmentStyle).toBe('VALUE_INVESTING');

      const mdas6 = await prisma.asset.findUniqueOrThrow({ where: { ticker: 'MDAS6' } });
      expect(mdas6.riskRating).toBe('A');

      const mdas9 = await prisma.asset.findUniqueOrThrow({ where: { ticker: 'MDAS9' } });
      expect(mdas9.riskRating).toBe('B');
    },
  );

  it(
    '(8) running refreshAllQuotes() after an import updates currentPrice but leaves ' +
      'every classification field exactly as imported',
    async () => {
      await marketDataService.importAssetsCsv(readFixture('assets-full.csv'));

      await marketDataService.refreshAllQuotes();

      const mdas1 = await prisma.asset.findUniqueOrThrow({ where: { ticker: 'MDAS1' } });
      expect(mdas1.currentPrice).toBe(42.5);
      expect(mdas1).toMatchObject({
        sector: 'FINANCIAL',
        subSector: 'BANCOS',
        investmentStyle: 'DIVIDENDS',
        riskRating: 'A',
        assetType: 'EQUITY',
      });
    },
  );
});
