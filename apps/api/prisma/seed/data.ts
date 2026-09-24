// Fixtures for the demo seed (specs/demo-seed/spec.md -> "Seeded content").
// Prices are close to recent B3 quotes; `priceUpdatedAt` is intentionally left
// out (null) so the first live refresh treats every price as stale.
import type { InvestmentStyle, RiskRating } from '../../generated/prisma/client';

export interface DemoAsset {
  ticker: string;
  name: string;
  sector: string;
  subSector: string;
  investmentStyle: InvestmentStyle;
  riskRating: RiskRating;
  currentPrice: number;
  /** Daily volatility of the generated random walk. */
  dailyVolatility: number;
}

export interface DemoHolding {
  ticker: string;
  quantity: number;
  avgPrice: number;
}

export interface DemoFixtures {
  user: { email: string; password: string; name: string };
  assets: DemoAsset[];
  holdings: DemoHolding[];
}

export const DEMO_FIXTURES: DemoFixtures = {
  user: { email: 'demo@example.com', password: 'Demo1234!', name: 'Demo User' },
  assets: [
    { ticker: 'PETR4', name: 'Petrobras PN', sector: 'Energy', subSector: 'Oil and Gas', investmentStyle: 'DIVIDENDS', riskRating: 'BB', currentPrice: 37.5, dailyVolatility: 0.016 },
    { ticker: 'VALE3', name: 'Vale ON', sector: 'Materials', subSector: 'Mining', investmentStyle: 'VALUE_INVESTING', riskRating: 'BBB', currentPrice: 62.4, dailyVolatility: 0.017 },
    { ticker: 'ITUB4', name: 'Itau Unibanco PN', sector: 'Financials', subSector: 'Banks', investmentStyle: 'DIVIDENDS', riskRating: 'AA', currentPrice: 34.8, dailyVolatility: 0.012 },
    { ticker: 'BBAS3', name: 'Banco do Brasil ON', sector: 'Financials', subSector: 'Banks', investmentStyle: 'VALUE_INVESTING', riskRating: 'BB_PLUS', currentPrice: 27.9, dailyVolatility: 0.014 },
    { ticker: 'TAEE11', name: 'Taesa Units', sector: 'Utilities', subSector: 'Electric Transmission', investmentStyle: 'DIVIDENDS', riskRating: 'AA_MINUS', currentPrice: 35.6, dailyVolatility: 0.01 },
    { ticker: 'EGIE3', name: 'Engie Brasil ON', sector: 'Utilities', subSector: 'Electric Generation', investmentStyle: 'DIVIDENDS', riskRating: 'AA', currentPrice: 41.2, dailyVolatility: 0.01 },
    { ticker: 'WEGE3', name: 'WEG ON', sector: 'Industrials', subSector: 'Electrical Equipment', investmentStyle: 'TURNAROUND', riskRating: 'A', currentPrice: 48.7, dailyVolatility: 0.014 },
    { ticker: 'BBSE3', name: 'BB Seguridade ON', sector: 'Financials', subSector: 'Insurance', investmentStyle: 'DIVIDENDS', riskRating: 'A_PLUS', currentPrice: 33.1, dailyVolatility: 0.011 },
    { ticker: 'PRIO3', name: 'PRIO ON', sector: 'Energy', subSector: 'Oil and Gas', investmentStyle: 'SMALL_CAP', riskRating: 'BB_MINUS', currentPrice: 44.3, dailyVolatility: 0.02 },
    { ticker: 'TUPY3', name: 'Tupy ON', sector: 'Industrials', subSector: 'Auto Parts', investmentStyle: 'SMALL_CAP', riskRating: 'B_PLUS', currentPrice: 21.6, dailyVolatility: 0.018 },
    { ticker: 'POMO4', name: 'Marcopolo PN', sector: 'Industrials', subSector: 'Machinery', investmentStyle: 'MICRO_CAP', riskRating: 'BB', currentPrice: 9.8, dailyVolatility: 0.019 },
    { ticker: 'BOVA11', name: 'iShares Ibovespa ETF', sector: 'ETF', subSector: 'Broad Market', investmentStyle: 'ETF', riskRating: 'BBB_MINUS', currentPrice: 128.5, dailyVolatility: 0.011 },
  ],
  holdings: [
    { ticker: 'PETR4', quantity: 400, avgPrice: 33.2 },
    { ticker: 'VALE3', quantity: 150, avgPrice: 66.1 },
    { ticker: 'ITUB4', quantity: 500, avgPrice: 30.5 },
    { ticker: 'BBAS3', quantity: 300, avgPrice: 25.4 },
    { ticker: 'TAEE11', quantity: 250, avgPrice: 34.0 },
    { ticker: 'EGIE3', quantity: 200, avgPrice: 39.8 },
    { ticker: 'WEGE3', quantity: 180, avgPrice: 42.3 },
    { ticker: 'BBSE3', quantity: 220, avgPrice: 31.0 },
    { ticker: 'PRIO3', quantity: 100, avgPrice: 40.7 },
    { ticker: 'BOVA11', quantity: 60, avgPrice: 121.0 },
  ],
};
