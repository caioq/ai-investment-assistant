import { Inject, Injectable } from '@nestjs/common';
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
    const quotes = await this.priceProvider.getQuote(assets.map((asset) => asset.ticker));
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
