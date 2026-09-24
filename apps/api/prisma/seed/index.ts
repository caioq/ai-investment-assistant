// Demo seed entry point (specs/demo-seed/spec.md). `runSeed` is exported so the
// e2e suite can run the real seed against namespaced fixtures; `main()` only
// runs when this file is executed directly.
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, WalletType } from '../../generated/prisma/client';
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

function daysAgo(days: number): Date {
  const today = todayAtUtcMidnight();
  return new Date(today.getTime() - days * 24 * 60 * 60 * 1000);
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
      await tx.advisorAnalysis.deleteMany({ where: { userId: user.id } });
      await tx.advisorReport.deleteMany({ where: { userId: user.id } });
      await tx.recommendedHolding.deleteMany({ where: { recommendedPortfolio: { userId: user.id } } });
      await tx.recommendedPortfolio.deleteMany({ where: { userId: user.id } });
      await tx.importLog.deleteMany({ where: { userId: user.id } });

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

      const monthAgo = daysAgo(30);
      const portfolios: { walletType: WalletType; id: string }[] = [];
      for (const wallet of fixtures.wallets) {
        const portfolio = await tx.recommendedPortfolio.create({
          data: {
            userId: user.id,
            walletType: wallet.walletType,
            sourceName: 'Demo Research',
            effectiveDate: monthAgo,
            holdings: {
              create: wallet.holdings.map((h) => ({
                assetId: h.ticker ? idByTicker.get(h.ticker)! : null,
                label: h.label,
                targetWeightPct: h.targetWeightPct,
                limitPrice: h.limitPrice,
                recommendation: h.recommendation,
                dividendYieldPct: h.dividendYieldPct,
                marginOfSafetyPct: h.marginOfSafetyPct,
              })),
            },
          },
        });
        portfolios.push({ walletType: wallet.walletType, id: portfolio.id });
      }

      const report = await tx.advisorReport.create({
        data: {
          userId: user.id,
          sourceName: fixtures.report.publisher,
          fileName: fixtures.report.fileName,
          rawText: fixtures.report.rawText,
          title: fixtures.report.title,
          publisher: fixtures.report.publisher,
          publishedAt: monthAgo,
          uploadedAt: daysAgo(2),
        },
      });
      await tx.advisorAnalysis.create({
        data: {
          userId: user.id,
          advisorReportId: report.id,
          recommendedPortfolioIds: portfolios.map((p) => p.id),
          ...fixtures.analysis,
          model: 'demo-seed (pre-generated)',
        },
      });

      // Record counts mirror what was actually seeded, so the /data-sources
      // cards and history agree with the rest of the demo data.
      await tx.importLog.createMany({
        data: [
          { source: 'ASSETS' as const, fileName: fixtures.importFiles.assets, records: fixtures.assets.length, createdAt: daysAgo(6) },
          { source: 'HOLDINGS' as const, fileName: fixtures.importFiles.holdings, records: fixtures.holdings.length, createdAt: daysAgo(5) },
          ...fixtures.wallets.map((w, i) => ({
            source: 'WALLET' as const,
            walletType: w.walletType,
            fileName: w.fileName,
            records: w.holdings.length,
            createdAt: daysAgo(4 - i),
          })),
          { source: 'REPORT' as const, fileName: fixtures.report.fileName, records: 1, createdAt: daysAgo(1) },
        ].map((log) => ({ ...log, userId: user.id, status: 'IMPORTED' as const })),
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
