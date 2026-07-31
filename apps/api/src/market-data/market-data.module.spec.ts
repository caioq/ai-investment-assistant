import { Test } from '@nestjs/testing';
import { MarketDataModule } from './market-data.module';
import { MarketDataService } from './market-data.service';
import { PRICE_PROVIDER } from './providers/price-provider.interface';
import { PrismaModule } from '../prisma/prisma.module';

describe('MarketDataModule', () => {
  it('resolves a PRICE_PROVIDER exposing callable getQuote/getHistory, and MarketDataService', async () => {
    // PrismaModule is @Global() (see CONVENTIONS.md -> "Module structure"),
    // which only takes effect once it's part of the compiled module graph —
    // in production that's via AppModule, so it must be imported explicitly
    // here since this test compiles MarketDataModule in isolation.
    const module = await Test.createTestingModule({
      imports: [PrismaModule, MarketDataModule],
    }).compile();

    const provider = module.get(PRICE_PROVIDER);
    expect(typeof provider.getQuote).toBe('function');
    expect(typeof provider.getHistory).toBe('function');

    const service = module.get(MarketDataService);
    expect(service).toBeInstanceOf(MarketDataService);
  });
});
