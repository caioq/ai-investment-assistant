// Demo seed entry point (specs/demo-seed/spec.md). `runSeed` is exported so the
// e2e suite can run the real seed against namespaced fixtures; `main()` only
// runs when this file is executed directly.
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';
import { hashPassword } from '../../src/auth/password';
import { DEMO_FIXTURES, DemoFixtures } from './data';
import { assertSeedAllowed } from './guard';
import { compoundedIndex, randomWalk, weekdaysEndingAt } from './series';

const POINTS = 250;
const IBOVESPA_END_VALUE = 130000;
const CDI_ANNUAL_RATE_PCT = 10.5;

function todayAtUtcMidnight(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export async function runSeed(prisma: PrismaClient, fixtures: DemoFixtures = DEMO_FIXTURES): Promise<void> {
  const passwordHash = await hashPassword(fixtures.user.password);
  const dates = weekdaysEndingAt(todayAtUtcMidnight(), POINTS);
  const windowStart = dates[0];
  const windowEnd = dates[dates.length - 1];
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setUTCFullYear(twelveMonthsAgo.getUTCFullYear() - 1);

  // Deterministic closes per asset, computed in memory so snapshots do not
  // depend on whether the global PriceHistory rows get written.
  const closesByTicker = new Map<string, number[]>();
  for (const asset of fixtures.assets) {
    const series = randomWalk({
      key: asset.ticker,
      endValue: asset.currentPrice,
      dates,
      dailyVolatility: asset.dailyVolatility,
    });
    closesByTicker.set(
      asset.ticker,
      series.map((p) => p.close),
    );
  }

  await prisma.$transaction(
    async (tx) => {
      const user = await tx.user.upsert({
        where: { email: fixtures.user.email },
        update: { passwordHash, name: fixtures.user.name },
        create: { email: fixtures.user.email, passwordHash, name: fixtures.user.name },
      });

      // Foreign-key order; only this user's rows.
      await tx.portfolioValueSnapshot.deleteMany({ where: { userId: user.id } });
      await tx.holding.deleteMany({ where: { userId: user.id } });

      // Assets are global: insert only, never update, and remember which
      // tickers this run actually created.
      const tickers = fixtures.assets.map((a) => a.ticker);
      const existing = await tx.asset.findMany({
        where: { ticker: { in: tickers } },
        select: { ticker: true },
      });
      const existingTickers = new Set(existing.map((a) => a.ticker));
      await tx.asset.createMany({
        data: fixtures.assets.map((a) => ({
          ticker: a.ticker,
          name: a.name,
          sector: a.sector,
          subSector: a.subSector,
          investmentStyle: a.investmentStyle,
          riskRating: a.riskRating,
          currentPrice: a.currentPrice,
        })),
        skipDuplicates: true,
      });
      const createdTickers = tickers.filter((t) => !existingTickers.has(t));

      const assets = await tx.asset.findMany({ where: { ticker: { in: tickers } } });
      const idByTicker = new Map(assets.map((a) => [a.ticker, a.id]));

      await tx.holding.createMany({
        data: fixtures.holdings.map((h) => ({
          userId: user.id,
          assetId: idByTicker.get(h.ticker)!,
          quantity: h.quantity,
          avgPrice: h.avgPrice,
          createdAt: twelveMonthsAgo,
        })),
      });

      await tx.priceHistory.createMany({
        data: createdTickers.flatMap((ticker) =>
          closesByTicker.get(ticker)!.map((close, i) => ({
            assetId: idByTicker.get(ticker)!,
            date: dates[i],
            close,
          })),
        ),
        skipDuplicates: true,
      });

      const totalInvested = fixtures.holdings.reduce((sum, h) => sum + h.quantity * h.avgPrice, 0);
      await tx.portfolioValueSnapshot.createMany({
        data: dates.map((date, i) => ({
          userId: user.id,
          date,
          totalValue: fixtures.holdings.reduce((sum, h) => sum + h.quantity * closesByTicker.get(h.ticker)![i], 0),
          totalInvested,
        })),
      });

      // Benchmarks are global: only fill one that has nothing in the window.
      const inWindow = { gte: windowStart, lte: windowEnd };
      if ((await tx.benchmarkSnapshot.count({ where: { benchmark: 'IBOVESPA', date: inWindow } })) === 0) {
        const series = randomWalk({ key: 'IBOVESPA', endValue: IBOVESPA_END_VALUE, dates, dailyVolatility: 0.01 });
        await tx.benchmarkSnapshot.createMany({
          data: series.map((p) => ({ benchmark: 'IBOVESPA' as const, date: p.date, value: p.close })),
          skipDuplicates: true,
        });
      }
      if ((await tx.benchmarkSnapshot.count({ where: { benchmark: 'CDI', date: inWindow } })) === 0) {
        const series = compoundedIndex({ dates, annualRatePct: CDI_ANNUAL_RATE_PCT });
        await tx.benchmarkSnapshot.createMany({
          data: series.map((p) => ({ benchmark: 'CDI' as const, date: p.date, value: p.value })),
          skipDuplicates: true,
        });
      }
    },
    { timeout: 60_000, maxWait: 10_000 },
  );
}

async function main(): Promise<void> {
  // Load .env only for the CLI (importing it from the e2e suite would be noise).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('dotenv/config');
  // Must precede `new PrismaClient`: a refused run never opens a database connection.
  assertSeedAllowed(process.env);

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  try {
    await runSeed(prisma);
    console.log(`Seeded demo account ${DEMO_FIXTURES.user.email} / ${DEMO_FIXTURES.user.password}`);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
