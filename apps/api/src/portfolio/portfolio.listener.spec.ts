import { Test } from '@nestjs/testing';
import { EventEmitterModule, EventEmitter2 } from '@nestjs/event-emitter';
import { MARKET_DATA_REFRESH_COMPLETED_EVENT } from '../market-data/market-data.service';
import { PortfolioListener } from './portfolio.listener';
import { PortfolioService } from './portfolio.service';

/**
 * Builds `PortfolioListener` behind a real `EventEmitterModule.forRoot()`
 * (rather than calling `handleMarketDataRefreshCompleted` directly) so the
 * `@OnEvent` registration itself is exercised, not just the method body —
 * same rationale as `market-data.cron.spec.ts` asserting against a real
 * `SchedulerRegistry` instead of only calling the handler.
 */
describe('PortfolioListener', () => {
  async function buildApp(portfolioService: { snapshotAllUsers: jest.Mock }) {
    const moduleRef = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [PortfolioListener, { provide: PortfolioService, useValue: portfolioService }],
    }).compile();

    const app = moduleRef.createNestApplication();
    await app.init();
    return app;
  }

  it('is registered for market-data.refresh.completed and calls PortfolioService.snapshotAllUsers exactly once', async () => {
    const portfolioService = { snapshotAllUsers: jest.fn().mockResolvedValue(undefined) };
    const app = await buildApp(portfolioService);

    const eventEmitter = app.get(EventEmitter2);
    await eventEmitter.emitAsync(MARKET_DATA_REFRESH_COMPLETED_EVENT, { refreshed: 3 });

    expect(portfolioService.snapshotAllUsers).toHaveBeenCalledTimes(1);

    await app.close();
  });

  it('does not snapshot when the refresh reported refreshed: 0 (a Yahoo outage, not a real refresh)', async () => {
    const portfolioService = { snapshotAllUsers: jest.fn().mockResolvedValue(undefined) };
    const app = await buildApp(portfolioService);

    const eventEmitter = app.get(EventEmitter2);
    await eventEmitter.emitAsync(MARKET_DATA_REFRESH_COMPLETED_EVENT, { refreshed: 0 });

    expect(portfolioService.snapshotAllUsers).not.toHaveBeenCalled();

    await app.close();
  });
});
