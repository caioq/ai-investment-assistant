import { Test } from '@nestjs/testing';
import { MarketDataModule } from './market-data.module';
import { MarketDataService } from './market-data.service';
import { PRICE_PROVIDER } from './providers/price-provider.interface';

describe('MarketDataModule', () => {
  it('resolves a PRICE_PROVIDER exposing callable getQuote/getHistory, and MarketDataService', async () => {
    const module = await Test.createTestingModule({
      imports: [MarketDataModule],
    }).compile();

    const provider = module.get(PRICE_PROVIDER);
    expect(typeof provider.getQuote).toBe('function');
    expect(typeof provider.getHistory).toBe('function');

    const service = module.get(MarketDataService);
    expect(service).toBeInstanceOf(MarketDataService);
  });
});
