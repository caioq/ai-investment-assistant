import { Module } from '@nestjs/common';
import { MarketDataService } from './market-data.service';
import { B3BrapiProvider } from './providers/b3-brapi.provider';
import { PRICE_PROVIDER } from './providers/price-provider.interface';

/**
 * `B3BrapiProvider` is registered against the `PRICE_PROVIDER` token (rather
 * than the concrete class) so `MarketDataService` — and any future
 * `FixedIncomeProvider`/`CryptoProvider` — depend on the `PriceProvider`
 * interface, not a specific vendor. See providers/price-provider.interface.ts.
 */
@Module({
  providers: [MarketDataService, { provide: PRICE_PROVIDER, useClass: B3BrapiProvider }],
  exports: [MarketDataService],
})
export class MarketDataModule {}
