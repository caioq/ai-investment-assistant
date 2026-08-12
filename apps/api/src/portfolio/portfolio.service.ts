import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MarketDataService } from '../market-data/market-data.service';
import { Holding } from '../../generated/prisma/client';

/**
 * Business logic for the `portfolio` module lives here per CONVENTIONS.md ->
 * "Module structure" (controllers stay thin).
 */
@Injectable()
export class PortfolioService {
  private readonly logger = new Logger(PortfolioService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly marketDataService: MarketDataService,
  ) {}

  /**
   * `POST /portfolio/holdings` (PORTFOLIO_US-1_T-1). Three things happen in
   * one request, per the task's own breakdown:
   *
   * 1. Find-or-create the `Asset` by ticker, normalised to uppercase before
   *    lookup — `Asset.ticker` is `@unique`, so `petr4` vs `PETR4` would
   *    otherwise create two rows and silently split one position in two.
   * 2. Upsert the `Holding` on `@@unique([userId, assetId])`: re-adding a
   *    held ticker updates `quantity`/`avgPrice` rather than inserting a
   *    duplicate (spec AC-2).
   * 3. For a newly-created `Asset` only, trigger the historical backfill
   *    fire-and-forget — `MarketDataService.backfillHistory` reaches out to
   *    Yahoo Finance (unofficial, rate-limited) and has no internal
   *    `try`/`catch`, so it must never be able to fail this request. Its own
   *    `.catch()` here logs at `error` level instead, degrading to "the
   *    chart starts flat" rather than "I can't add stocks."
   */
  async createHolding(
    userId: string,
    ticker: string,
    quantity: number,
    avgPrice: number,
  ): Promise<Holding> {
    const normalizedTicker = ticker.toUpperCase();

    let asset = await this.prisma.asset.findUnique({ where: { ticker: normalizedTicker } });
    let isNewAsset = false;

    if (!asset) {
      asset = await this.prisma.asset.create({
        data: { ticker: normalizedTicker, name: normalizedTicker },
      });
      isNewAsset = true;
    }

    const holding = await this.prisma.holding.upsert({
      where: { userId_assetId: { userId, assetId: asset.id } },
      update: { quantity, avgPrice },
      create: { userId, assetId: asset.id, quantity, avgPrice },
    });

    if (isNewAsset) {
      this.marketDataService.backfillHistory(asset.id).catch((error: unknown) => {
        this.logger.error(
          `backfillHistory failed for newly-created asset ${asset!.ticker} (${asset!.id}): ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      });
    }

    return holding;
  }
}
