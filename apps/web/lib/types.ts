/**
 * The frontend never declares its own copy of a shape `packages/shared`
 * already owns (see `CONVENTIONS.md` → "Frontend → Shared utilities"). This
 * file re-exports those shapes plus the response shapes `packages/shared`
 * does not (yet) own, as the API contracts in the specs define them.
 */
export {
  ALLOCATION_COLOR_PALETTE,
  type AllocationSlice,
} from "@ai-investment-assistant/shared";
export type { PortfolioValuePoint } from "@ai-investment-assistant/shared";

/** `GET /portfolio/summary` response (see `specs/portfolio/spec.md`). */
export interface PortfolioSummary {
  totalInvested: number;
  currentValue: number;
  gainLoss: number;
  returnPct: number;
}

/** `GET /portfolio/performance` response (see `specs/portfolio/spec.md`). */
export interface PerformanceResponse {
  series: PortfolioValuePointDto[];
  benchmarkSeries?: PortfolioValuePointDto[];
  cagr: number;
  volatility: number;
  maxDrawdown: number;
  vsBenchmarkPct: number;
}

/**
 * A `PortfolioValuePoint` as it arrives over HTTP: `date` is a JSON string,
 * not a `Date` instance (unlike `packages/shared`'s `PortfolioValuePoint`,
 * which is the pure-calculation input shape).
 */
export interface PortfolioValuePointDto {
  date: string;
  value: number;
}

/** `Asset`, as embedded in `GET /portfolio/holdings` (see `specs/market-data/spec.md`). */
export interface Asset {
  id: string;
  ticker: string;
  name: string;
  assetType: string;
  currency: string;
  exchange: string;
  sector: string | null;
  subSector: string | null;
  investmentStyle: string | null;
  riskRating: string | null;
  currentPrice: number | null;
  currentChangePct: number | null;
  priceUpdatedAt: string | null;
}

/** `GET /portfolio/holdings` response entry: `Holding` joined with `Asset` (see `specs/portfolio/spec.md`). */
export interface HoldingWithAsset {
  id: string;
  userId: string;
  assetId: string;
  quantity: number;
  avgPrice: number;
  metadata: unknown;
  createdAt: string;
  updatedAt: string;
  asset: Asset;
}

/** `POST /portfolio/holdings/upload-csv` response (see `specs/portfolio/spec.md`). */
export interface CsvUploadResult {
  created: number;
  updated: number;
  errors: string[];
}

/** `AdvisorAnalysis`, as returned by `POST /advisor/analyze` and `GET /advisor/analysis/latest` (see `specs/advisor/spec.md`). */
export interface AdvisorAnalysis {
  score: number;
  summary: string;
  strengths: string[];
  risks: string[];
  recommendations: string[];
  impactMetrics: { label: string; value: string }[];
  model: string;
  createdAt: string;
}

/** `AdvisorReport`, as returned by `POST /advisor/reports/upload` (see `specs/advisor/spec.md`). */
export interface AdvisorReport {
  id: string;
  userId: string;
  sourceName: string | null;
  fileName: string | null;
  rawText: string;
  uploadedAt: string;
}

/** `{ id, email, name }`, returned by `/auth/register`, `/auth/login`, and `GET /auth/me` (see `specs/auth/spec.md`). */
export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
}
