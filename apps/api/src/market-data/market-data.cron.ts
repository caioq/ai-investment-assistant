import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MarketDataService } from './market-data.service';

/**
 * Runs `MarketDataService.refreshAllQuotes()` once daily after B3 close.
 * Timezone is set explicitly rather than relying on the host clock, which is
 * UTC in CI and in any container deploy — see spec.md -> Behavior Notes.
 */
@Injectable()
export class MarketDataCron {
  constructor(private readonly marketDataService: MarketDataService) {}

  @Cron('30 18 * * 1-5', {
    name: 'marketDataDailyRefresh',
    timeZone: 'America/Sao_Paulo',
  })
  async handleDailyRefresh(): Promise<void> {
    await this.marketDataService.refreshAllQuotes();
  }
}
