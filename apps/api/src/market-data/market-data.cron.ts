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
}
