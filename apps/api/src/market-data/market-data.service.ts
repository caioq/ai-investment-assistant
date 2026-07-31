import { Inject, Injectable } from '@nestjs/common';
import { PRICE_PROVIDER, PriceProvider } from './providers/price-provider.interface';

/**
 * Injects `PriceProvider` via the `PRICE_PROVIDER` token rather than naming
 * `B3BrapiProvider` directly, so the cron/aggregation logic added by later
 * tasks (MARKET_DATA_US-1_T-2..T-4, MARKET_DATA_US-2_T-2, MARKET_DATA_US-4_T-*)
 * never depends on a specific vendor. See spec.md -> Behavior Notes.
 */
@Injectable()
export class MarketDataService {
  constructor(@Inject(PRICE_PROVIDER) private readonly priceProvider: PriceProvider) {}
}
