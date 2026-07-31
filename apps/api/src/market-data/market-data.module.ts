import { Module } from '@nestjs/common';
import { MarketDataCron } from './market-data.cron';
import { MarketDataService } from './market-data.service';
import { B3BrapiProvider } from './providers/b3-brapi.provider';
import { PRICE_PROVIDER } from './providers/price-provider.interface';

/**
 * `B3BrapiProvider` is registered against the `PRICE_PROVIDER` token (rather
 * than the concrete class) so `MarketDataService` — and any future
 * `FixedIncomeProvider`/`CryptoProvider` — depend on the `PriceProvider`
 * interface, not a specific vendor. See providers/price-provider.interface.ts.
 *
 * `MarketDataCron` schedules `MarketDataService.refreshAllQuotes()` daily
 * after B3 close (see market-data.cron.ts). Relies on `ScheduleModule.forRoot()`
 * being registered once at the app level (see app.module.ts) so
 * `SchedulerRegistry` is available to resolve the `@Cron` decorator.
 */
@Module({
  providers: [
    MarketDataService,
    MarketDataCron,
    { provide: PRICE_PROVIDER, useClass: B3BrapiProvider },
  ],
  exports: [MarketDataService],
})
export class MarketDataModule {}
