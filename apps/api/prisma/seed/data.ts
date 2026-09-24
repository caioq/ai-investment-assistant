// Fixtures for the demo seed (specs/demo-seed/spec.md -> "Seeded content").
// Prices are close to recent B3 quotes; `priceUpdatedAt` is intentionally left
// out (null) so the first live refresh treats every price as stale.
import type { InvestmentStyle, Recommendation, RiskRating, WalletType } from '../../generated/prisma/client';

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

export interface DemoWalletHolding {
  /** Null for the fixed-income line, which is not a tradable B3 ticker. */
  ticker: string | null;
  label: string;
  targetWeightPct?: number;
  limitPrice?: number;
  recommendation?: Recommendation;
  dividendYieldPct?: number;
  marginOfSafetyPct?: number;
}

export interface DemoWallet {
  walletType: WalletType;
  fileName: string;
  holdings: DemoWalletHolding[];
}

export interface DemoAnalysis {
  score: number;
  summary: string;
  strengths: string[];
  risks: string[];
  recommendations: string[];
  impactMetrics: { label: string; value: string }[];
}

export interface DemoReport {
  title: string;
  publisher: string;
  fileName: string;
  rawText: string;
}

export interface DemoFixtures {
  user: { email: string; password: string; name: string };
  assets: DemoAsset[];
  holdings: DemoHolding[];
  wallets: DemoWallet[];
  report: DemoReport;
  analysis: DemoAnalysis;
  /** File names shown in the import history (record counts come from the seeded rows). */
  importFiles: { assets: string; holdings: string };
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
  wallets: [
    {
      walletType: 'DIVIDENDS',
      fileName: 'carteira-dividendos.csv',
      holdings: [
        { ticker: 'PETR4', label: 'Petrobras', recommendation: 'BUY', limitPrice: 40.0, dividendYieldPct: 14.2, marginOfSafetyPct: 6.7 },
        { ticker: 'ITUB4', label: 'Itau Unibanco', recommendation: 'BUY', limitPrice: 36.5, dividendYieldPct: 6.8, marginOfSafetyPct: 4.9 },
        { ticker: 'TAEE11', label: 'Taesa', recommendation: 'NEUTRAL', limitPrice: 36.0, dividendYieldPct: 9.4, marginOfSafetyPct: 1.1 },
        { ticker: 'EGIE3', label: 'Engie Brasil', recommendation: 'BUY', limitPrice: 44.0, dividendYieldPct: 7.9, marginOfSafetyPct: 6.8 },
        { ticker: 'BBSE3', label: 'BB Seguridade', recommendation: 'BUY', limitPrice: 35.0, dividendYieldPct: 8.6, marginOfSafetyPct: 5.7 },
      ],
    },
    {
      walletType: 'OVERALL_RECOMMENDED',
      fileName: 'carteira-recomendada.csv',
      holdings: [
        { ticker: 'ITUB4', label: 'Itau Unibanco', targetWeightPct: 14, recommendation: 'BUY', limitPrice: 36.5, marginOfSafetyPct: 4.9 },
        { ticker: 'WEGE3', label: 'WEG', targetWeightPct: 12, recommendation: 'BUY', limitPrice: 52.0, marginOfSafetyPct: 6.8 },
        { ticker: 'VALE3', label: 'Vale', targetWeightPct: 10, recommendation: 'NEUTRAL', limitPrice: 65.0, marginOfSafetyPct: 4.0 },
        { ticker: 'TAEE11', label: 'Taesa', targetWeightPct: 10, recommendation: 'NEUTRAL', limitPrice: 36.0, marginOfSafetyPct: 1.1 },
        { ticker: 'EGIE3', label: 'Engie Brasil', targetWeightPct: 8, recommendation: 'BUY', limitPrice: 44.0, marginOfSafetyPct: 6.8 },
        { ticker: 'BBAS3', label: 'Banco do Brasil', targetWeightPct: 8, recommendation: 'BUY', limitPrice: 31.0, marginOfSafetyPct: 10.0 },
        { ticker: 'PETR4', label: 'Petrobras', targetWeightPct: 8, recommendation: 'BUY', limitPrice: 40.0, marginOfSafetyPct: 6.7 },
        { ticker: 'BBSE3', label: 'BB Seguridade', targetWeightPct: 10, recommendation: 'BUY', limitPrice: 35.0, marginOfSafetyPct: 5.7 },
        { ticker: null, label: 'Renda Fixa - LFT Tesouro', targetWeightPct: 20 },
      ],
    },
    {
      walletType: 'SMALL_CAPS',
      fileName: 'carteira-small-caps.csv',
      holdings: [
        { ticker: 'PRIO3', label: 'PRIO', recommendation: 'BUY', limitPrice: 50.0, marginOfSafetyPct: 11.4 },
        { ticker: 'TUPY3', label: 'Tupy', recommendation: 'NEUTRAL', limitPrice: 23.0, marginOfSafetyPct: 6.1 },
        { ticker: 'POMO4', label: 'Marcopolo', recommendation: 'BUY', limitPrice: 11.5, marginOfSafetyPct: 14.8 },
      ],
    },
  ],
  report: {
    title: 'Demo Research - Monthly Strategy Outlook',
    publisher: 'Demo Research',
    fileName: 'demo-research-monthly-outlook.pdf',
    rawText: [
      'Monthly strategy outlook. We keep a constructive view on Brazilian equities, favouring cash-generative companies with resilient dividends. Banks and regulated utilities remain core positions, supported by stable earnings and attractive yields relative to the Selic rate.',
      'Energy: oil prices remain volatile, and while Petrobras keeps paying strong dividends, we recommend limiting single-stock exposure. Mining names are neutral given uncertainty over Chinese demand.',
      'Allocation: we suggest holding roughly 20% in Treasury floating-rate bonds (LFT) as a liquidity buffer, and adding small caps selectively, only where the margin of safety exceeds 10%.',
    ].join('\n\n'),
  },
  analysis: {
    score: 7.4,
    summary:
      'The portfolio is dividend-oriented and well diversified across banks, utilities and energy, in line with the research house wallets. Concentration in Financials and the lack of a fixed-income buffer are the main gaps against the recommended allocation.',
    strengths: [
      'Solid dividend core: ITUB4, TAEE11, EGIE3 and BBSE3 match the Dividends wallet.',
      'Sector spread across Financials, Utilities, Energy and Industrials limits single-theme risk.',
      'BOVA11 provides broad market exposure at low cost.',
    ],
    risks: [
      'Financials weigh heavily (ITUB4, BBAS3, BBSE3), so the portfolio is sensitive to interest-rate and credit cycles.',
      'PETR4 and PRIO3 add correlated oil-price risk.',
      'No fixed-income position, while the report suggests about 20% in LFT as a buffer.',
    ],
    recommendations: [
      'Build a Treasury LFT position toward the 20% suggested by the Overall Recommended wallet.',
      'Trim PETR4 toward the 8% target weight to reduce oil concentration.',
      'Consider small caps such as POMO4, where the margin of safety is above 10%.',
    ],
    impactMetrics: [
      { label: 'Fixed-income weight', value: '0% -> 20%' },
      { label: 'Energy exposure', value: '-4 pp' },
      { label: 'Wallet alignment', value: '62% -> 78%' },
    ],
  },
  importFiles: { assets: 'assets.csv', holdings: 'holdings.csv' },
};
