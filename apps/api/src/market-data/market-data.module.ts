import { Module } from '@nestjs/common';
import { MarketDataCron } from './market-data.cron';
import { MarketDataService } from './market-data.service';
import { B3YahooProvider } from './providers/b3-yahoo.provider';
import { PRICE_PROVIDER } from './providers/price-provider.interface';

/**
 * `PriceProvider` is an interface, so DI needs an explicit token
 * (`PRICE_PROVIDER`) to bind an implementation to it — see
 * `providers/price-provider.interface.ts`. `B3YahooProvider` is registered
 * behind that token rather than injected by its concrete class, so
 * `MarketDataService` (and any future consumer) never names it directly.
 */
@Module({
  providers: [
    MarketDataService,
    MarketDataCron,
    B3YahooProvider,
    { provide: PRICE_PROVIDER, useExisting: B3YahooProvider },
  ],
  exports: [MarketDataService],
})
export class MarketDataModule {}
