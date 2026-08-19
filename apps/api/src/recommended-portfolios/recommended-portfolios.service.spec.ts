import { readFileSync } from 'fs';
import { join } from 'path';
import { BadRequestException } from '@nestjs/common';
import { WalletType } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RecommendedPortfoliosService } from './recommended-portfolios.service';

/**
 * RECOMMENDED_PORTFOLIOS_US-1_T-4 — whole-file validation.
 *
 * Unit test with a mocked `PrismaService`, per CONVENTIONS.md -> "Testing" —
 * direct instantiation, same pattern as `PortfolioService`'s own spec. Reuses
 * the three synthetic fixtures from RECOMMENDED_PORTFOLIOS_SHARED_T-3, mutated
 * in-memory per case rather than adding new fixture files, so each case's
 * intent (row N, field X) stays legible in the test itself.
 */

const FIXTURE_DIR = join(
  __dirname,
  '..',
  '..',
  'test',
  'fixtures',
  'recommended-portfolios',
);

function readFixture(name: string): string {
  return readFileSync(join(FIXTURE_DIR, name), 'utf8');
}

/** Replaces a full, unique CSV data line with a mutated version of itself. */
function replaceLine(csv: string, originalLine: string, mutatedLine: string): string {
  expect(csv).toContain(originalLine);
  return csv.replace(originalLine, mutatedLine);
}

const OVERALL_ROW_1 =
  'Alfa Energia Participacoes,"R$ 47,50","R$ 52,00","3,10%",RPFA3,"25,00%",COMPRA,"8,00%",AAA';
const OVERALL_ROW_2 =
  'Bravo Saneamento SA,"R$ 1.234,56","R$ 1.310,00","-1,45%",RPFB4,"20,00%",COMPRA,"5,40%",A';

describe('RecommendedPortfoliosService', () => {
  let service: RecommendedPortfoliosService;
  let prisma: { recommendedPortfolio: { create: jest.Mock } };

  beforeEach(() => {
    prisma = {
      recommendedPortfolio: {
        create: jest.fn().mockResolvedValue({ id: 'portfolio-id', holdings: [] }),
      },
    };
    service = new RecommendedPortfoliosService(prisma as unknown as PrismaService);
  });

  function upload(csvText: string) {
    return service.uploadWallet({
      userId: 'user-id',
      walletType: WalletType.OVERALL_RECOMMENDED,
      csvText,
      effectiveDate: new Date('2026-01-01T00:00:00.000Z'),
    });
  }

  it('rejects a targetWeightPct above 100, names the row, and never writes (spec AC-8)', async () => {
    const csv = replaceLine(
      readFixture('overall-recommended.csv'),
      OVERALL_ROW_1,
      OVERALL_ROW_1.replace('"25,00%"', '"150,00%"'),
    );

    await expect(upload(csv)).rejects.toBeInstanceOf(BadRequestException);
    await expect(upload(csv)).rejects.toThrow(/row 1/);
    expect(prisma.recommendedPortfolio.create).not.toHaveBeenCalled();
  });

  it('rejects a negative targetWeightPct the same way — the bound is two-sided', async () => {
    const csv = replaceLine(
      readFixture('overall-recommended.csv'),
      OVERALL_ROW_1,
      OVERALL_ROW_1.replace('"25,00%"', '"-5,00%"'),
    );

    await expect(upload(csv)).rejects.toBeInstanceOf(BadRequestException);
    await expect(upload(csv)).rejects.toThrow(/row 1/);
    expect(prisma.recommendedPortfolio.create).not.toHaveBeenCalled();
  });

  it('reports two bad rows in one error, naming both row numbers', async () => {
    let csv = readFixture('overall-recommended.csv');
    csv = replaceLine(csv, OVERALL_ROW_1, OVERALL_ROW_1.replace('"25,00%"', '"150,00%"'));
    csv = replaceLine(csv, OVERALL_ROW_2, OVERALL_ROW_2.replace('"20,00%"', '"-5,00%"'));

    await expect(upload(csv)).rejects.toThrow(/row 1/);
    await expect(upload(csv)).rejects.toThrow(/row 2/);
    expect(prisma.recommendedPortfolio.create).not.toHaveBeenCalled();
  });

  it('rejects an unrecognised RECOMENDACAO value (spec AC-4)', async () => {
    const csv = replaceLine(
      readFixture('overall-recommended.csv'),
      OVERALL_ROW_1,
      OVERALL_ROW_1.replace('COMPRA', 'MANTER'),
    );

    await expect(upload(csv)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.recommendedPortfolio.create).not.toHaveBeenCalled();
  });

  it('validates all three unmodified fixtures clean — no false positives', async () => {
    await expect(upload(readFixture('overall-recommended.csv'))).resolves.toBeDefined();
    await expect(upload(readFixture('dividends.csv'))).resolves.toBeDefined();
    await expect(upload(readFixture('small-caps.csv'))).resolves.toBeDefined();

    expect(prisma.recommendedPortfolio.create).toHaveBeenCalledTimes(3);
  });

  it('validates a wallet whose weights sum to 60 clean, per the spec Non-Goal', async () => {
    const csv = [
      'EMPRESA,CODIGO,PRECO_TETO,ALOCACAO_SUGERIDA,RECOMENDACAO',
      'Alfa Energia Participacoes,RPFA3,"R$ 52,00","30,00%",COMPRA',
      'Bravo Saneamento SA,RPFB4,"R$ 40,00","30,00%",NEUTRO',
    ].join('\n');

    await expect(upload(csv)).resolves.toBeDefined();
    expect(prisma.recommendedPortfolio.create).toHaveBeenCalledTimes(1);
  });
});
