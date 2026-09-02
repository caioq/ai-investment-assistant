import { PrismaService } from '../prisma/prisma.service';
import { PortfolioService, PerformanceResponse, PortfolioSummary } from '../portfolio/portfolio.service';
import {
  RecommendedPortfoliosService,
  RecommendedPortfolioWithHoldings,
} from '../recommended-portfolios/recommended-portfolios.service';
import { AdvisorService } from './advisor.service';
import { Asset, Holding } from '../../generated/prisma/client';

/**
 * `AdvisorService.buildAnalysisPrompt` (ADVISOR_US-2_T-2) is the function
 * this task builds: the three-block prompt from spec.md -> Behavior Notes,
 * separable from the actual Claude API call (ADVISOR_US-2_T-3). Unit test
 * with all three dependency services stubbed, per CONVENTIONS.md ->
 * "Testing" (direct instantiation, no `Test.createTestingModule`) — same
 * pattern as `PortfolioService`'s own spec.
 */

const EMPTY_PERFORMANCE: PerformanceResponse = {
  series: [],
  cagr: 0,
  volatility: 0,
  maxDrawdown: 0,
};

const EMPTY_SUMMARY: PortfolioSummary = {
  totalInvested: 0,
  currentValue: 0,
  gainLoss: 0,
  returnPct: 0,
};

/** Builds a minimal `Asset` fixture, classification fields defaulting to `null`. */
function makeAsset(overrides: Partial<Asset> = {}): Asset {
  return {
    id: 'asset-id',
    ticker: 'TICK3',
    name: 'Ticker Corp',
    assetType: 'EQUITY',
    sector: null,
    subSector: null,
    currency: 'BRL',
    exchange: 'B3',
    investmentStyle: null,
    riskRating: null,
    currentPrice: null,
    currentChangePct: null,
    priceUpdatedAt: null,
    ...overrides,
  } as Asset;
}

function makeHolding(asset: Asset, overrides: Partial<Holding> = {}): Holding & { asset: Asset } {
  return {
    id: 'holding-id',
    userId: 'user-id',
    assetId: asset.id,
    quantity: 10,
    avgPrice: 20,
    metadata: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    asset,
    ...overrides,
  } as Holding & { asset: Asset };
}

describe('AdvisorService.buildAnalysisPrompt', () => {
  let prisma: { advisorReport: { findFirst: jest.Mock } };
  let portfolioService: {
    listHoldings: jest.Mock;
    getAllocation: jest.Mock;
    getSummary: jest.Mock;
    getPerformance: jest.Mock;
  };
  let recommendedPortfoliosService: { getLatestPerWallet: jest.Mock };
  let service: AdvisorService;

  beforeEach(() => {
    prisma = { advisorReport: { findFirst: jest.fn() } };
    portfolioService = {
      listHoldings: jest.fn().mockResolvedValue([]),
      getAllocation: jest.fn().mockResolvedValue([]),
      getSummary: jest.fn().mockResolvedValue(EMPTY_SUMMARY),
      getPerformance: jest.fn().mockResolvedValue(EMPTY_PERFORMANCE),
    };
    recommendedPortfoliosService = {
      getLatestPerWallet: jest.fn().mockResolvedValue([]),
    };

    service = new AdvisorService(
      prisma as unknown as PrismaService,
      portfolioService as unknown as PortfolioService,
      recommendedPortfoliosService as unknown as RecommendedPortfoliosService,
    );
  });

  it('(1) includes each holding ticker, sector and risk rating for a fully-populated portfolio', async () => {
    const asset = makeAsset({
      id: 'asset-1',
      ticker: 'PETR4',
      sector: 'Energy',
      subSector: 'Oil & Gas',
      investmentStyle: 'VALUE_INVESTING',
      riskRating: 'AA',
      currentPrice: 38.5,
    });
    portfolioService.listHoldings.mockResolvedValue([makeHolding(asset, { quantity: 100, avgPrice: 30 })]);

    const prompt = await service.buildAnalysisPrompt('user-id');

    expect(prompt).toContain('PETR4');
    expect(prompt).toContain('Energy');
    expect(prompt).toContain('AA');
  });

  it('(2) contains no "undefined" or literal "null" for an entirely-unclassified portfolio', async () => {
    const asset = makeAsset({ id: 'asset-2', ticker: 'VALE3' });
    portfolioService.listHoldings.mockResolvedValue([makeHolding(asset)]);
    recommendedPortfoliosService.getLatestPerWallet.mockResolvedValue([
      {
        id: 'wallet-1',
        userId: 'user-id',
        walletType: 'OVERALL_RECOMMENDED',
        sourceName: null,
        effectiveDate: new Date('2026-01-01'),
        uploadedAt: new Date('2026-01-01'),
        holdings: [
          {
            id: 'rh-1',
            recommendedPortfolioId: 'wallet-1',
            assetId: null,
            asset: null,
            label: 'Some Unclassified Ticker',
            targetWeightPct: null,
            limitPrice: null,
            recommendation: null,
            dividendYieldPct: null,
            marginOfSafetyPct: null,
          },
        ],
      },
    ] as unknown as RecommendedPortfolioWithHoldings[]);

    const prompt = await service.buildAnalysisPrompt('user-id');

    expect(prompt).not.toMatch(/undefined/);
    expect(prompt).not.toMatch(/\bnull\b/);
  });

  it('(3) carries a recommended-only ticker\'s sector and riskRating, proving the widened asset include is wired through', async () => {
    const recommendedAsset = makeAsset({
      id: 'asset-3',
      ticker: 'XPTO3',
      sector: 'Technology',
      riskRating: 'BBB',
    });
    recommendedPortfoliosService.getLatestPerWallet.mockResolvedValue([
      {
        id: 'wallet-2',
        userId: 'user-id',
        walletType: 'SMALL_CAPS',
        sourceName: null,
        effectiveDate: new Date('2026-01-01'),
        uploadedAt: new Date('2026-01-01'),
        holdings: [
          {
            id: 'rh-2',
            recommendedPortfolioId: 'wallet-2',
            assetId: recommendedAsset.id,
            asset: recommendedAsset,
            label: 'XPTO SA',
            targetWeightPct: 5,
            limitPrice: 12.3,
            recommendation: 'BUY',
            dividendYieldPct: null,
            marginOfSafetyPct: null,
          },
        ],
      },
    ] as unknown as RecommendedPortfolioWithHoldings[]);

    const prompt = await service.buildAnalysisPrompt('user-id');

    expect(prompt).toContain('XPTO3');
    expect(prompt).toContain('Technology');
    expect(prompt).toContain('BBB');
  });

  it('(4) truncates a rawText longer than the character budget and says so in the prompt', async () => {
    const longText = 'A'.repeat(20_000);
    prisma.advisorReport.findFirst.mockResolvedValue({
      id: 'report-1',
      userId: 'user-id',
      sourceName: 'XP',
      fileName: null,
      rawText: longText,
      uploadedAt: new Date('2026-01-01'),
    });

    const prompt = await service.buildAnalysisPrompt('user-id', 'report-1');

    expect(prompt).not.toContain('A'.repeat(20_000));
    expect(prompt.match(/A/g)?.length).toBeLessThan(20_000);
    expect(prompt).toMatch(/truncat/i);
  });

  it('(5) omits block 2 entirely when no advisorReportId is passed', async () => {
    const prompt = await service.buildAnalysisPrompt('user-id');

    expect(prisma.advisorReport.findFirst).not.toHaveBeenCalled();
    expect(prompt).not.toMatch(/research house report/i);
  });

  it('(6) surfaces both currentPrice and limitPrice for a ticker whose currentPrice exceeds its recommended limitPrice', async () => {
    const sharedAsset = makeAsset({
      id: 'asset-4',
      ticker: 'ITSA4',
      currentPrice: 55.5,
    });
    portfolioService.listHoldings.mockResolvedValue([makeHolding(sharedAsset, { quantity: 50, avgPrice: 40 })]);
    recommendedPortfoliosService.getLatestPerWallet.mockResolvedValue([
      {
        id: 'wallet-3',
        userId: 'user-id',
        walletType: 'DIVIDENDS',
        sourceName: null,
        effectiveDate: new Date('2026-01-01'),
        uploadedAt: new Date('2026-01-01'),
        holdings: [
          {
            id: 'rh-3',
            recommendedPortfolioId: 'wallet-3',
            assetId: sharedAsset.id,
            asset: sharedAsset,
            label: 'Itausa',
            targetWeightPct: 10,
            limitPrice: 40.25,
            recommendation: 'HOLD',
            dividendYieldPct: null,
            marginOfSafetyPct: null,
          },
        ],
      },
    ] as unknown as RecommendedPortfolioWithHoldings[]);

    const prompt = await service.buildAnalysisPrompt('user-id');

    expect(prompt).toContain('55.5');
    expect(prompt).toContain('40.25');
  });
});
