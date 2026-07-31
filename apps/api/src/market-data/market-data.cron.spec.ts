import { Test } from '@nestjs/testing';
import { SchedulerRegistry, ScheduleModule } from '@nestjs/schedule';
import { MarketDataCron } from './market-data.cron';
import { MarketDataService } from './market-data.service';

describe('MarketDataCron', () => {
  it('registers handleDailyRefresh at 30 18 * * 1-5 in America/Sao_Paulo, delegating to refreshAllQuotes', async () => {
    const refreshAllQuotes = jest.fn().mockResolvedValue({ refreshed: 0 });

    const module = await Test.createTestingModule({
      imports: [ScheduleModule.forRoot()],
      providers: [
        MarketDataCron,
        { provide: MarketDataService, useValue: { refreshAllQuotes } },
      ],
    }).compile();

    const app = module.createNestApplication();
    await app.init();

    const registry = app.get(SchedulerRegistry);
    const job = registry.getCronJob('marketDataDailyRefresh');

    expect(job).toBeDefined();
    expect(job.cronTime.source).toBe('30 18 * * 1-5');
    expect(job.cronTime.timeZone).toBe('America/Sao_Paulo');

    const cron = module.get(MarketDataCron);
    await cron.handleDailyRefresh();

    expect(refreshAllQuotes).toHaveBeenCalledTimes(1);

    await app.close();
  });
});
