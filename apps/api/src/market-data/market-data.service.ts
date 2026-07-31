import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PRICE_PROVIDER, PriceProvider } from './providers/price-provider.interface';

export interface RefreshSummary {
  refreshed: number;
}

/** Today's date at UTC midnight, matching `PriceHistory.date`'s `@db.Date` column. */
function todayAtUtcMidnight(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * Injects `PriceProvider` via the `PRICE_PROVIDER` token rather than naming
 * `B3BrapiProvider` directly, so the cron/aggregation logic added by later
 * tasks (MARKET_DATA_US-1_T-2..T-4, MARKET_DATA_US-2_T-2, MARKET_DATA_US-4_T-*)
 * never depends on a specific vendor. See spec.md -> Behavior Notes.
 */
@Injectable()
export class MarketDataService {
  private readonly logger = new Logger(MarketDataService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(PRICE_PROVIDER) private readonly priceProvider: PriceProvider,
  ) {}

  /**
   * Iterates `Asset` (never `Holding`, which belongs to the not-yet-built
   * `portfolio` module — see spec.md -> "Module boundary"), batches every
   * ticker into one `getQuote` call, then updates each Asset's price fields
   * and upserts today's `PriceHistory` row.
   */
  async refreshAllQuotes(): Promise<RefreshSummary> {
    const assets = await this.prisma.asset.findMany();

    let quotes;
    try {
      quotes = await this.priceProvider.getQuote(assets.map((asset) => asset.ticker));
    } catch (error) {
      // Spec AC-4: a stale-but-real price is usable; a null one breaks every
      // downstream value/allocation computation, and an unhandled rejection
      // inside a cron tick would take the scheduler down with it. So the
      // failure is logged and existing Asset prices are left untouched
      // rather than rethrown.
      this.logger.error('Failed to refresh quotes from price provider', error);
      return { refreshed: 0 };
    }

    const quoteByTicker = new Map(quotes.map((quote) => [quote.ticker, quote]));
    const date = todayAtUtcMidnight();

    let refreshed = 0;
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

      refreshed++;
    }

    return { refreshed };
  }
}
