import { Logger } from '@nestjs/common';
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

  it('registers handleBenchmarkSync at 19:00 BRT on weekdays, distinct from the price refresh schedule', async () => {
    const marketDataService = {
      refreshAllQuotes: jest.fn().mockResolvedValue({ refreshed: 0 }),
      syncIbovespa: jest.fn().mockResolvedValue(undefined),
      syncCdi: jest.fn().mockResolvedValue(undefined),
    };

    const moduleRef = await Test.createTestingModule({
      imports: [ScheduleModule.forRoot()],
      providers: [MarketDataCron, { provide: MarketDataService, useValue: marketDataService }],
    }).compile();

    const app = moduleRef.createNestApplication();
    await app.init();

    const schedulerRegistry = app.get(SchedulerRegistry);
    const cronJob = schedulerRegistry.getCronJob('market-data-benchmark-sync');

    expect(cronJob).toBeDefined();
    expect(cronJob.cronTime.source).toBe('0 19 * * 1-5');
    expect(cronJob.cronTime.source).not.toBe('30 18 * * 1-5');
    expect(cronJob.cronTime.timeZone).toBe('America/Sao_Paulo');

    await app.close();
  });

  it('calls both syncIbovespa and syncCdi once each', async () => {
    const marketDataService = {
      refreshAllQuotes: jest.fn().mockResolvedValue({ refreshed: 0 }),
      syncIbovespa: jest.fn().mockResolvedValue(undefined),
      syncCdi: jest.fn().mockResolvedValue(undefined),
    };

    const cron = new MarketDataCron(marketDataService as unknown as MarketDataService);

    await cron.handleBenchmarkSync();

    expect(marketDataService.syncIbovespa).toHaveBeenCalledTimes(1);
    expect(marketDataService.syncCdi).toHaveBeenCalledTimes(1);
  });

  it('isolates failures: syncIbovespa rejecting still lets syncCdi run, resolves rather than rejecting, and logs an error', async () => {
    const marketDataService = {
      refreshAllQuotes: jest.fn().mockResolvedValue({ refreshed: 0 }),
      syncIbovespa: jest.fn().mockRejectedValue(new Error('Yahoo Finance unreachable')),
      syncCdi: jest.fn().mockResolvedValue(undefined),
    };
    const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    const cron = new MarketDataCron(marketDataService as unknown as MarketDataService);

    await expect(cron.handleBenchmarkSync()).resolves.not.toThrow();

    expect(marketDataService.syncCdi).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
  });
});
