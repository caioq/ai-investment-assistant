import { Recommendation } from '../../generated/prisma/client';
import { parseBrazilianNumber } from './brazilian-number';
import type { RawWalletRow } from './wallet-csv';

/**
 * A `RawWalletRow` mapped onto the `RecommendedHolding` shape (see spec's
 * Data Model), with every numeric field passed through `parseBrazilianNumber`
 * (RECOMMENDED_PORTFOLIOS_US-1_T-1). `RISCO`, `SETOR`, `CATEGORIA`,
 * `PRECO_ATUAL`, `VARIACAO` and `PRECO_TETO_2` are spec Non-Goals and have no
 * field here.
 */
export interface NormalizedWalletRow {
  /** `CODIGO`, uppercased for `Asset` resolution; `null` when the row has no ticker. */
  ticker: string | null;
  label: string;
  limitPrice: number | null;
  targetWeightPct: number | null;
  recommendation: Recommendation | null;
  dividendYieldPct: number | null;
  marginOfSafetyPct: number | null;
}

const RECOMMENDATION_MAP: Record<string, Recommendation> = {
  COMPRA: Recommendation.BUY,
  NEUTRO: Recommendation.NEUTRAL,
  VENDA: Recommendation.SELL,
};

/**
 * An unrecognised, non-empty `RECOMENDACAO` is a row error rather than a
 * silent `null` — a new call the research house introduces (beyond
 * COMPRA/NEUTRO/VENDA) must surface rather than disappear.
 */
function normalizeRecommendation(raw: string | undefined): Recommendation | null {
  const trimmed = raw?.trim() ?? '';
  if (trimmed === '') {
    return null;
  }

  const mapped = RECOMMENDATION_MAP[trimmed];
  if (mapped === undefined) {
    throw new Error(`Unrecognised RECOMENDACAO value: "${raw}"`);
  }

  return mapped;
}

/**
 * Maps a name-keyed raw row onto the `RecommendedHolding` shape. A row with
 * an empty `CODIGO` keeps its `label` and `targetWeightPct` and resolves no
 * asset (`ticker: null`) — the Overall wallet's tickerless
 * "Renda Fixa - LFT Tesouro" line, which must not be dropped.
 */
export function normalizeWalletRow(row: RawWalletRow): NormalizedWalletRow {
  const trimmedCodigo = row.CODIGO?.trim() ?? '';

  return {
    ticker: trimmedCodigo === '' ? null : trimmedCodigo.toUpperCase(),
    label: row.EMPRESA ?? '',
    limitPrice: parseBrazilianNumber(row.PRECO_TETO),
    targetWeightPct: parseBrazilianNumber(row.ALOCACAO_SUGERIDA),
    recommendation: normalizeRecommendation(row.RECOMENDACAO),
    dividendYieldPct: parseBrazilianNumber(row.DY),
    marginOfSafetyPct: parseBrazilianNumber(row.MARGEM_DE_SEGURANCA),
  };
}
