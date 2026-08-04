import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PriceProvider, PRICE_PROVIDER, Quote } from './providers/price-provider.interface';
import { Benchmark } from '../../generated/prisma/client';

/** Today at UTC midnight, matching `PriceHistory.date`'s `@db.Date` column. */
function todayAtUtcMidnight(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** Banco Central SGS API, series 12 = CDI, daily rate in percent. See spec.md -> Behavior Notes. */
const CDI_SGS_SERIES_URL = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados';

interface SgsDataPoint {
  data: string; // DD/MM/YYYY
  valor: string; // daily rate in percent, e.g. "0.043739"
}

/** `DD/MM/YYYY`, as required by the SGS API's `dataInicial`/`dataFinal` query params. */
function formatSgsDate(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = date.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

/** Parses SGS's `DD/MM/YYYY` string into a UTC-midnight `Date` — not `MM/DD/YYYY`. */
function parseSgsDate(data: string): Date {
  const [day, month, year] = data.split('/').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * TTL for `getOrRefreshPrice`'s on-demand refresh gate (spec.md -> Behavior
 * Notes: "gated by a 15-minute TTL on priceUpdatedAt").
 */
const REFRESH_TTL_MS = 15 * 60 * 1000;

/** Response shape for `getOrRefreshPrice`, matching the debug endpoint's contract (spec.md -> API Contract). */
export interface AssetQuote {
  ticker: string;
  price: number;
  changePct: number;
  updatedAt: Date;
}

/**
 * Aggregation/cron logic for market data (price refresh, backfill,
 * benchmark sync) lands here across `MARKET_DATA_US-1..4`. The provider is
 * injected via the `PRICE_PROVIDER` token, never the concrete
 * `B3YahooProvider` class, so a future `FixedIncomeProvider`/`CryptoProvider`
 * can be added without touching this service (spec.md -> Behavior Notes).
 */
@Injectable()
export class MarketDataService {
  private readonly logger = new Logger(MarketDataService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(PRICE_PROVIDER) private readonly priceProvider: PriceProvider,
  ) {}

  /**
   * Refreshes `currentPrice`/`currentChangePct`/`priceUpdatedAt` for every
   * `Asset` and upserts today's `PriceHistory` row for each, in a single
   * batched `getQuote` call (spec.md -> "Batching is mandatory"). Iterates
   * `Asset` rows, not `Holding` rows — see spec.md -> "Module boundary" and
   * `../stories/README.md` -> "Dependency ordering".
   */
  async refreshAllQuotes(): Promise<{ refreshed: number }> {
    const assets = await this.prisma.asset.findMany();
    const tickers = assets.map((asset) => asset.ticker);

    let quotes: Quote[];
    try {
      quotes = await this.priceProvider.getQuote(tickers);
    } catch (error) {
      // Spec AC-4: a provider failure (network error, non-2xx, malformed
      // payload) must not null out or leave stale `Asset.currentPrice`
      // values, and must not crash the process (e.g. an unhandled rejection
      // inside a cron tick taking the scheduler down with it). A stale-but-
      // real price stays usable; logging is the only side effect here.
      this.logger.error(
        `refreshAllQuotes: PriceProvider.getQuote failed, leaving existing Asset prices untouched: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { refreshed: 0 };
    }

    const quoteByTicker = new Map(quotes.map((quote) => [quote.ticker, quote]));
    const date = todayAtUtcMidnight();

    for (const asset of assets) {
      const quote = quoteByTicker.get(asset.ticker);
      if (!quote) continue;

      await this.prisma.asset.update({
        where: { id: asset.id },
        data: {
          currentPrice: quote.price,
          currentChangePct: quote.changePct,
          priceUpdatedAt: new Date(),
        },
      });

      await this.prisma.priceHistory.upsert({
        where: { assetId_date: { assetId: asset.id, date } },
        update: { close: quote.price },
        create: { assetId: asset.id, date, close: quote.price },
      });
    }

    return { refreshed: assets.length };
  }

  /**
   * One-off fetch backfilling a full year of daily history for a single
   * asset (spec.md -> Behavior Notes: "a one-off fetch (range=1y&interval=1d)
   * backfills PriceHistory so the performance chart isn't empty"). The
   * write uses `skipDuplicates: true` against `PriceHistory`'s
   * `@@unique([assetId, date])` constraint, so calling this twice for the
   * same asset neither throws nor double-inserts (spec AC-3).
   */
  async backfillHistory(assetId: string): Promise<void> {
    const asset = await this.prisma.asset.findUniqueOrThrow({ where: { id: assetId } });
    const series = await this.priceProvider.getHistory(asset.ticker, '1y', '1d');

    await this.prisma.priceHistory.createMany({
      data: series.map((point) => ({
        assetId,
        date: point.date,
        close: point.close,
      })),
      skipDuplicates: true,
    });
  }

  /**
   * Fetches 1y of daily Ibovespa closes and writes one BenchmarkSnapshot row
   * per point (spec.md -> Behavior Notes). The write uses
   * `skipDuplicates: true` against `BenchmarkSnapshot`'s
   * `@@unique([benchmark, date])` constraint, so this can run daily without
   * throwing on days already stored.
   */
  async syncIbovespa(): Promise<void> {
    const series = await this.priceProvider.getHistory('^BVSP', '1y', '1d');

    await this.prisma.benchmarkSnapshot.createMany({
      data: series.map((point) => ({
        benchmark: 'IBOVESPA' as const,
        date: point.date,
        value: point.close,
      })),
      skipDuplicates: true,
    });
  }

  /**
   * Fetches 1y of daily CDI from the Banco Central SGS API (series 12) and
   * writes one `BenchmarkSnapshot` row per business day, idempotent on
   * `@@unique([benchmark, date])`. SGS returns a daily rate in percent, not
   * a price level, so it's compounded into an index starting at 100 on the
   * series' first day (spec.md -> "CDI is compounded into an index before
   * storage") — this keeps `BenchmarkSnapshot.value` unit-consistent with
   * `IBOVESPA`. Separate upstream/failure domain from `syncIbovespa`: a
   * failure here is logged, not propagated, so one benchmark being down
   * doesn't block the other (spec.md -> Behavior Notes).
   */
  async syncCdi(): Promise<void> {
    const dataFinal = new Date();
    const dataInicial = new Date(dataFinal);
    dataInicial.setUTCFullYear(dataInicial.getUTCFullYear() - 1);

    const url = `${CDI_SGS_SERIES_URL}?formato=json&dataInicial=${formatSgsDate(dataInicial)}&dataFinal=${formatSgsDate(dataFinal)}`;

    let series: SgsDataPoint[];
    try {
      const response = await fetch(url);
      series = (await response.json()) as SgsDataPoint[];
    } catch (error) {
      this.logger.error('Failed to fetch CDI history from Banco Central SGS', error);
      return;
    }

    let index = 100;
    const rows = series.map(({ data, valor }, i) => {
      if (i > 0) {
        index *= 1 + Number(valor) / 100;
      }

      return {
        benchmark: Benchmark.CDI,
        date: parseSgsDate(data),
        value: index,
      };
    });

    await this.prisma.benchmarkSnapshot.createMany({
      data: rows,
      skipDuplicates: true,
    });
  }

  /**
   * On-demand refresh for interactive use (spec.md -> Behavior Notes),
   * gated by a 15-minute TTL on `Asset.priceUpdatedAt`: within the TTL,
   * returns the stored price with no upstream call; otherwise refreshes
   * through the same batched `PriceProvider.getQuote(tickers[])` path as
   * `refreshAllQuotes`, using a one-element array so an on-demand refresh is
   * "still always executed as a batch call even if triggered by a single
   * asset lookup" (US-4 story notes). A `null` `priceUpdatedAt` (never
   * priced) is treated as a cache miss.
   */
  async getOrRefreshPrice(assetId: string): Promise<AssetQuote> {
    const asset = await this.prisma.asset.findUniqueOrThrow({ where: { id: assetId } });

    const isFresh =
      asset.priceUpdatedAt !== null &&
      Date.now() - asset.priceUpdatedAt.getTime() < REFRESH_TTL_MS;

    if (isFresh) {
      return {
        ticker: asset.ticker,
        price: asset.currentPrice!,
        changePct: asset.currentChangePct!,
        updatedAt: asset.priceUpdatedAt!,
      };
    }

    const [quote] = await this.priceProvider.getQuote([asset.ticker]);
    const updatedAt = new Date();

    await this.prisma.asset.update({
      where: { id: asset.id },
      data: {
        currentPrice: quote.price,
        currentChangePct: quote.changePct,
        priceUpdatedAt: updatedAt,
      },
    });

    return {
      ticker: asset.ticker,
      price: quote.price,
      changePct: quote.changePct,
      updatedAt,
    };
  }
}
