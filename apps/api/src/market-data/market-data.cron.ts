import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MarketDataService } from './market-data.service';

/**
 * Daily price refresh, scheduled once per day after B3 close.
 * `30 18 * * 1-5` = 18:30 on weekdays (Mon-Fri), with the timezone set
 * explicitly to `America/Sao_Paulo` rather than relying on the host clock
 * (UTC in CI and container deploys) — spec.md -> Behavior Notes.
 */
@Injectable()
export class MarketDataCron {
  private readonly logger = new Logger(MarketDataCron.name);

  constructor(private readonly marketDataService: MarketDataService) {}

  @Cron('30 18 * * 1-5', {
    name: 'market-data-daily-refresh',
    timeZone: 'America/Sao_Paulo',
  })
  async handleDailyRefresh(): Promise<void> {
    const result = await this.marketDataService.refreshAllQuotes();
    this.logger.log(`Daily price refresh complete: ${result.refreshed} asset(s) refreshed.`);
  }

  /**
   * Benchmark sync (Ibovespa + CDI), scheduled as a separate job from the
   * price refresh, after it — spec.md -> "A separate job fetches Ibovespa
   * ... and CDI ... history". `0 19 * * 1-5` = 19:00 on weekdays, same
   * `America/Sao_Paulo` reasoning as `handleDailyRefresh`.
   *
   * `syncIbovespa`/`syncCdi` hit different upstreams (Yahoo Finance vs. BCB
   * SGS) with different outage windows, so they're run via
   * `Promise.allSettled` rather than sequential `await`s inside one `try` —
   * one upstream being down must not skip the other sync. Any rejection is
   * logged at `error` level, never propagated, so the cron tick itself
   * always resolves (specs/market-data/tasks/MARKET_DATA_US-3_T-3-benchmark-job.md).
   */
  @Cron('0 19 * * 1-5', {
    name: 'market-data-benchmark-sync',
    timeZone: 'America/Sao_Paulo',
  })
  async handleBenchmarkSync(): Promise<void> {
    const [ibovespaResult, cdiResult] = await Promise.allSettled([
      this.marketDataService.syncIbovespa(),
      this.marketDataService.syncCdi(),
    ]);

    if (ibovespaResult.status === 'rejected') {
      this.logger.error('Benchmark sync: syncIbovespa failed', ibovespaResult.reason);
    }
    if (cdiResult.status === 'rejected') {
      this.logger.error('Benchmark sync: syncCdi failed', cdiResult.reason);
    }
    if (ibovespaResult.status === 'fulfilled' && cdiResult.status === 'fulfilled') {
      this.logger.log('Benchmark sync complete: Ibovespa and CDI history refreshed.');
    }
  }
}
