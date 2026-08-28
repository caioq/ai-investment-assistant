import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { PriceProvider, PRICE_PROVIDER, Quote } from './providers/price-provider.interface';
import { Asset, Benchmark, Prisma } from '../../generated/prisma/client';
import { normalizeAssetRow } from './asset-row';
import { parseAssetsCsv } from './assets-csv';

/** Prisma's error code for a unique-constraint violation (matches `auth.service.ts`/`portfolio.service.ts`). */
const PRISMA_UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

/**
 * Fired after `refreshAllQuotes()` succeeds — see spec.md's Goals ("signals
 * that a price refresh has completed") and
 * `specs/portfolio/tasks/PORTFOLIO_US-5_T-2-daily-snapshot.md`, which builds
 * the subscriber side (`PortfolioListener`). Payload mirrors
 * `refreshAllQuotes`'s own return shape so a `{ refreshed: 0 }` failure/
 * no-op run is distinguishable from a real refresh without a second lookup.
 */
export const MARKET_DATA_REFRESH_COMPLETED_EVENT = 'market-data.refresh.completed';

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

/** Response shape for `importAssetsCsv`, matching `POST /market-data/assets/import`'s contract (spec.md -> API Contract). */
export interface ImportAssetsCsvResult {
  created: number;
  updated: number;
  errors: string[];
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
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Find-or-create an `Asset` by ticker, normalised to uppercase before
   * lookup — `Asset.ticker` is `@unique`, so `petr4` vs `PETR4` would
   * otherwise create two rows and silently split one position in two.
   *
   * Moved here from `PortfolioService.upsertHolding`'s private copy
   * (RECOMMENDED_PORTFOLIOS_US-1_T-5) — `market-data` owns the `Asset`
   * model, and `portfolio` already depends on `MarketDataService`. Callers
   * decide whether `wasCreated` should trigger a backfill; this method
   * deliberately doesn't call `backfillHistory` itself — see this module's
   * spec.md -> Behavior Notes: recommended wallets have no performance
   * chart and don't need a 1-year backfill per new ticker, unlike
   * `portfolio`'s holdings.
   *
   * Find-or-create is two statements, so two concurrent requests for the
   * same brand-new ticker can both see `null` from `findUnique` and both
   * attempt `create`. Postgres lets exactly one win; the other comes back
   * with a P2002 unique-constraint violation, which — unhandled — would
   * surface as a 500 on a perfectly ordinary request (two uploads racing
   * the same new ticker). On that race, re-read and return the winner's row
   * with `wasCreated: false`, so the loser doesn't re-trigger whatever the
   * caller does with a newly-created asset.
   */
  async findOrCreateAsset(ticker: string): Promise<{ asset: Asset; wasCreated: boolean }> {
    const normalizedTicker = ticker.toUpperCase();

    let asset = await this.prisma.asset.findUnique({ where: { ticker: normalizedTicker } });
    if (asset) {
      return { asset, wasCreated: false };
    }

    try {
      asset = await this.prisma.asset.create({
        data: { ticker: normalizedTicker, name: normalizedTicker },
      });
      return { asset, wasCreated: true };
    } catch (error) {
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== PRISMA_UNIQUE_CONSTRAINT_VIOLATION
      ) {
        throw error;
      }

      // Lost the race — the winner's row is committed, so re-read it and
      // carry on. A P2002 on `ticker` with no such row afterwards shouldn't
      // be reachable; rethrowing the original beats returning a confusing
      // "asset is null" further down.
      asset = await this.prisma.asset.findUnique({ where: { ticker: normalizedTicker } });
      if (!asset) {
        throw error;
      }

      return { asset, wasCreated: false };
    }
  }

  /**
   * `POST /market-data/assets/import` (MARKET_DATA_US-5_T-4) — the sole
   * writer of `Asset.sector`/`subSector`/`investmentStyle`/`riskRating`
   * (spec.md -> Data Model). Follows the partial-success pattern of
   * `PortfolioService.importHoldingsCsv` (CONVENTIONS.md -> "CSV parsing"):
   * each row is processed independently, a bad row is collected into
   * `errors[]`, and the rest of the file still imports.
   *
   * A row is validated (`normalizeAssetRow`, which throws on an
   * unrecognised enum value) *before* any write happens for it, so a bad
   * row can't leave a partially-applied update — the asset's existing
   * classification, if any, is left exactly as it was (spec AC "A row
   * whose riskRating is unrecognised...").
   *
   * Resolves the ticker via `findOrCreateAsset` rather than a bespoke
   * find-then-create (CONVENTIONS.md -> "Find-or-create master data"), but
   * — unlike `PortfolioService.upsertHolding` — never triggers
   * `backfillHistory` on `wasCreated: true`: classifying a ticker is not
   * the same as taking a position in it, and firing a year of history
   * fetches for every row of a large assets CSV would hammer the upstream
   * this module exists to protect (spec.md -> Non-Goals).
   *
   * The Prisma `update` payload is built from `normalizeAssetRow`'s own
   * returned keys (minus `ticker`, which only identifies the row) rather
   * than a fixed six-key literal — a key the normalizer omitted (column
   * absent from the CSV) must not appear in `data` at all, or it would
   * silently clear a field that column was never meant to touch (spec's
   * "Last upload wins" / absent-vs-empty rule).
   */
  async importAssetsCsv(csvText: string): Promise<ImportAssetsCsvResult> {
    const rows = parseAssetsCsv(csvText);

    let created = 0;
    let updated = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const rowNumber = i + 1;
      const row = rows[i];

      // A row with an empty ticker is spreadsheet furniture (e.g. a notes
      // line), not a malformed row — skipped silently, not counted, not
      // reported in errors[] (spec's ticker column rule).
      const rawTicker = (row.ticker ?? '').trim();
      if (!rawTicker) continue;

      try {
        const normalized = normalizeAssetRow(row);
        const { ticker, ...updateData } = normalized;
        const { asset, wasCreated } = await this.findOrCreateAsset(ticker);

        if (Object.keys(updateData).length > 0) {
          // Cast: `NormalizedAssetRow.assetType` is typed `AssetType | null`
          // like the other enum columns (asset-row.ts's shared
          // absent/empty/value handling), but `Asset.assetType` is
          // non-nullable in the schema (`@default(EQUITY)`). A CSV row
          // that actually clears `assetType` to empty is a genuine schema
          // violation, not a silent no-op — it throws here and is caught
          // below into this row's errors[] entry, same as any other bad
          // row, rather than being special-cased out of the generic
          // apply-only-the-returned-keys update below.
          await this.prisma.asset.update({
            where: { id: asset.id },
            data: updateData as Prisma.AssetUpdateInput,
          });
        }

        if (wasCreated) {
          created++;
        } else {
          updated++;
        }
      } catch (error) {
        errors.push(`row ${rowNumber}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return { created, updated, errors };
  }

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

    const result = { refreshed: assets.length };
    // Emitted only on the success path reached here — the try/catch above
    // returns early with { refreshed: 0 } on an upstream failure, which
    // never reaches this line (spec.md -> "Emit only on success").
    this.eventEmitter.emit(MARKET_DATA_REFRESH_COMPLETED_EVENT, result);
    return result;
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
      asset.priceUpdatedAt !== null && Date.now() - asset.priceUpdatedAt.getTime() < REFRESH_TTL_MS;

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
