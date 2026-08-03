import { Test } from '@nestjs/testing';
import { ScheduleModule, SchedulerRegistry } from '@nestjs/schedule';
import { MarketDataCron } from './market-data.cron';
import { MarketDataService } from './market-data.service';

describe('MarketDataCron', () => {
  it('registers handleDailyRefresh at 18:30 BRT on weekdays', async () => {
    const marketDataService = {
      refreshAllQuotes: jest.fn().mockResolvedValue({ refreshed: 0 }),
    };

    const moduleRef = await Test.createTestingModule({
      imports: [ScheduleModule.forRoot()],
      providers: [MarketDataCron, { provide: MarketDataService, useValue: marketDataService }],
    }).compile();

    const app = moduleRef.createNestApplication();
    await app.init();

    const schedulerRegistry = app.get(SchedulerRegistry);
    const cronJob = schedulerRegistry.getCronJob('market-data-daily-refresh');

    expect(cronJob).toBeDefined();
    expect(cronJob.cronTime.source).toBe('30 18 * * 1-5');
    // luxon-based CronTime exposes the configured timezone here.
    expect(cronJob.cronTime.timeZone).toBe('America/Sao_Paulo');

    await app.close();
  });

  it('delegates to MarketDataService.refreshAllQuotes exactly once', async () => {
    const marketDataService = {
      refreshAllQuotes: jest.fn().mockResolvedValue({ refreshed: 0 }),
    };

    const cron = new MarketDataCron(marketDataService as unknown as MarketDataService);

    await cron.handleDailyRefresh();

    expect(marketDataService.refreshAllQuotes).toHaveBeenCalledTimes(1);
  });
});
