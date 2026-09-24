import { parseCsv, validateHoldingsRows } from '@ai-investment-assistant/shared';
import { PrismaService } from '../prisma/prisma.service';
import { MarketDataService } from '../market-data/market-data.service';
import { PortfolioService } from './portfolio.service';

/**
 * Keeps the web preview's holdings validator (`packages/shared`) and the
 * server's `importHoldingsCsv` in lock-step: one fixture set through both,
 * asserting identical failing rows and messages. Only the parsing path is
 * under test, so `upsertHolding` is stubbed.
 */
describe('holdings parity: importHoldingsCsv vs validateHoldingsRows', () => {
  let service: PortfolioService;

  beforeEach(() => {
    service = new PortfolioService({} as PrismaService, {} as MarketDataService);
    jest
      .spyOn(service as unknown as { upsertHolding: () => Promise<unknown> }, 'upsertHolding')
      .mockResolvedValue({ holding: {}, wasCreated: true });
  });

  const H = 'ticker,quantity,avgPrice\n';
  const wide = Array.from({ length: 23 }, (_, i) => `c${i}`).join(',');
  const fixtures: Record<string, string> = {
    'clean file': `${H}PETR4,100,32.5\nVALE3,10,60\n`,
    '4-cell row': `${H}PETR4,1,2,3\nVALE3,10,60\n`,
    '2-cell row': `${H}PETR4,1\nVALE3,10,60\n`,
    'empty ticker': `${H},1,2\nVALE3,10,60\n`,
    'zero quantity': `${H}PETR4,0,2\n`,
    'negative price': `${H}PETR4,1,-5\n`,
    'non-numeric quantity': `${H}PETR4,abc,2\n`,
    'Brazilian-formatted number': `${H}PETR4,"1.234,56",2\nVALE3,1,"R$ 10,00"\n`,
    'exponent notation': `${H}PETR4,1e3,2\n`,
    'empty numeric cells': `${H}PETR4,,2\nVALE3,1,\n`,
    'different header text': `x,y\nPETR4,1,2\n`,
    'interior blank line': `${H}PETR4,1,2\n\nVALE3,0,2\n`,
    'CRLF line endings': `${H.trim()}\r\nPETR4,1,2\r\nVALE3,0,2\r\n`,
    'real 23-column export': `${wide}\n${wide}\n${wide}\n`,
  };

  it.each(Object.entries(fixtures))('%s', async (_name, csv) => {
    const server = await service.importHoldingsCsv('user-1', csv);
    const shared = validateHoldingsRows(parseCsv(csv), { knownTickers: ['PETR4', 'VALE3'] });
    const sharedErrors = shared.rowIssues
      .filter((i) => i.severity === 'error')
      .map((i) => i.message);

    expect(sharedErrors).toEqual(server.errors);
  });
});
