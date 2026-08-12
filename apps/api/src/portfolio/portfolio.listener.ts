import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { MARKET_DATA_REFRESH_COMPLETED_EVENT } from '../market-data/market-data.service';
import { PortfolioService } from './portfolio.service';

interface MarketDataRefreshCompletedPayload {
  refreshed: number;
}

/**
 * Subscribes to market-data's `market-data.refresh.completed` event (emitted
 * by `MarketDataService.refreshAllQuotes()` on success) and delegates to
 * `PortfolioService.snapshotAllUsers()` — see
 * `specs/portfolio/tasks/PORTFOLIO_US-5_T-2-daily-snapshot.md` for why an
 * event beats scheduling a second cron guessing how long the refresh takes.
 *
 * Kept as a dedicated `<module>.listener.ts` rather than inline in
 * `PortfolioService`, mirroring the `<module>.cron.ts` separation documented
 * in CONVENTIONS.md -> "Scheduled jobs": the handler only delegates, so the
 * actual snapshot logic stays unit-testable without the event bus.
 */
@Injectable()
export class PortfolioListener {
  private readonly logger = new Logger(PortfolioListener.name);

  constructor(private readonly portfolioService: PortfolioService) {}

  @OnEvent(MARKET_DATA_REFRESH_COMPLETED_EVENT)
  async handleMarketDataRefreshCompleted(
    payload: MarketDataRefreshCompletedPayload,
  ): Promise<void> {
    // refreshAllQuotes resolves with { refreshed: 0 } both when there were
    // no assets to refresh AND when the upstream provider failed and prices
    // were left untouched (spec.md -> "Emit only on success" /
    // refreshAllQuotes swallowing upstream errors). Snapshotting in the
    // latter case would record a flat day built from stale prices and
    // permanently corrupt the performance series with a fake data point.
    if (payload.refreshed === 0) {
      this.logger.log('Skipping snapshot: market data refresh reported 0 assets refreshed.');
      return;
    }

    await this.portfolioService.snapshotAllUsers();
  }
}
