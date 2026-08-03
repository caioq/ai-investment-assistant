import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PriceProvider, PRICE_PROVIDER, Quote } from './providers/price-provider.interface';

/** Today at UTC midnight, matching `PriceHistory.date`'s `@db.Date` column. */
function todayAtUtcMidnight(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
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
}
