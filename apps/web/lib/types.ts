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

/** `WalletType`, as accepted by `POST /advisor/recommended-portfolios/upload` (see `specs/recommended-portfolios/spec.md`). */
export type WalletType = "DIVIDENDS" | "OVERALL_RECOMMENDED" | "SMALL_CAPS";

/** `Recommendation`, normalised from the CSV's Portuguese `RECOMENDACAO` column (see `specs/recommended-portfolios/spec.md`). */
export type Recommendation = "BUY" | "NEUTRAL" | "SELL";

/** `RecommendedHolding`, as embedded in a `RecommendedPortfolio` (see `specs/recommended-portfolios/spec.md`). */
export interface RecommendedHolding {
  id: string;
  recommendedPortfolioId: string;
  assetId: string | null;
  label: string;
  targetWeightPct: number | null;
  limitPrice: number | null;
  recommendation: Recommendation | null;
  dividendYieldPct: number | null;
  marginOfSafetyPct: number | null;
}

/**
 * `RecommendedPortfolio`, as returned by `POST /advisor/recommended-portfolios/upload`
 * and `GET /advisor/recommended-portfolios/latest` (see `specs/recommended-portfolios/spec.md`).
 */
export interface RecommendedPortfolio {
  id: string;
  userId: string;
  walletType: WalletType;
  sourceName: string | null;
  effectiveDate: string;
  uploadedAt: string;
  holdings: RecommendedHolding[];
}

/**
 * `GET /data-sources/summary` response — everything the four source cards
 * need in one call (see `specs/data-sources/spec.md` → API Contract, and
 * `DataSourcesSummary` in `apps/api/src/data-sources/data-sources.service.ts`,
 * which this mirrors as it arrives over HTTP).
 */
export interface DataSourcesSummary {
  assets: { count: number; tickers: string[]; lastImportAt: string | null };
  holdings: { count: number; lastImportAt: string | null };
  wallets: {
    walletType: WalletType;
    effectiveDate: string;
    sourceName: string | null;
    positions: number;
  }[];
  report: {
    id: string;
    title: string | null;
    publisher: string | null;
    publishedAt: string | null;
    fileName: string | null;
    uploadedAt: string;
  } | null;
}

/** `ImportSource` — which of the four data sources an import attempt targeted. */
export type ImportSource = "ASSETS" | "HOLDINGS" | "WALLET" | "REPORT";

/** `ImportStatus` — whether the import attempt wrote anything at all. */
export type ImportStatus = "IMPORTED" | "FAILED";

/**
 * One `ImportLog` row as returned by `GET|POST /data-sources/imports`
 * (see `specs/data-sources/spec.md` → Data Model, and the Prisma `ImportLog`
 * model in `apps/api/prisma/schema.prisma`, which this mirrors over HTTP —
 * `userId` included, `createdAt` as an ISO string).
 *
 * `errors` holds every row the server rejected, **verbatim**, and is kept on
 * `IMPORTED` rows too: a partial success is one row reading "28 · 12
 * rejected", never one history row per rejected row. `null` means "no
 * rejected rows recorded", which is why it isn't simply `string[]`.
 */
export interface ImportLogEntry {
  id: string;
  source: ImportSource;
  walletType: WalletType | null;
  fileName: string;
  records: number;
  status: ImportStatus;
  message: string | null;
  errors: string[] | null;
  createdAt: string;
}

/** `{ id, email, name }`, returned by `/auth/register`, `/auth/login`, and `GET /auth/me` (see `specs/auth/spec.md`). */
export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
}
