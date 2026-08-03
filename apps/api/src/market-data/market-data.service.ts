import { Inject, Injectable } from '@nestjs/common';
import { PriceProvider, PRICE_PROVIDER } from './providers/price-provider.interface';

/**
 * Aggregation/cron logic for market data (price refresh, backfill,
 * benchmark sync) lands here across `MARKET_DATA_US-1..4`. The provider is
 * injected via the `PRICE_PROVIDER` token, never the concrete
 * `B3YahooProvider` class, so a future `FixedIncomeProvider`/`CryptoProvider`
 * can be added without touching this service (spec.md -> Behavior Notes).
 */
@Injectable()
export class MarketDataService {
  constructor(@Inject(PRICE_PROVIDER) private readonly priceProvider: PriceProvider) {}
}
