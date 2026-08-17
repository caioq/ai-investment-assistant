const UNCLASSIFIED_LABEL = "Unclassified";

/**
 * Palette used to derive a slice's `color` from its `label`, exported so
 * dashboard-ui's AllocationDonut renders the exact same colors instead of
 * keeping a second copy that can drift.
 */
export const ALLOCATION_COLOR_PALETTE = [
  "#2563eb", // blue-600
  "#16a34a", // green-600
  "#d97706", // amber-600
  "#dc2626", // red-600
  "#7c3aed", // violet-600
  "#0891b2", // cyan-600
  "#db2777", // pink-600
  "#65a30d", // lime-600
  "#ea580c", // orange-600
  "#4f46e5", // indigo-600
] as const;

export interface AllocationInput {
  label: string | null;
  value: number;
}

export interface AllocationSlice {
  label: string;
  value: number;
  pct: number;
  color: string;
}

/**
 * Derives a stable index into `ALLOCATION_COLOR_PALETTE` from a label, via a
 * small deterministic string hash. Deliberately not based on array
 * position/index: slices are sorted by value, so an index-based color would
 * reshuffle every label's color whenever the underlying values change the
 * sort order.
 */
function colorForLabel(label: string): string {
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = (hash * 31 + label.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % ALLOCATION_COLOR_PALETTE.length;
  return ALLOCATION_COLOR_PALETTE[index];
}

/**
 * Groups allocation entries by label and sums their value, returning the
 * shape of GET /portfolio/allocation's response: `{ label, value, pct, color }[]`.
 *
 * - `label: null` collapses into a single "Unclassified" slice rather than
 *   being dropped (dropping would make `pct` sum to 100 across only a subset
 *   of the portfolio).
 * - `pct` is computed so it sums to 100 (within floating-point tolerance)
 *   for any non-empty input, including edge cases like a single holding
 *   (exactly 100) or three equal holdings (33.33... x 3, not 99.99).
 * - Slices are sorted by `value` descending.
 * - `color` is a deterministic function of `label`, not of the slice's
 *   position in the sorted output.
 */
export function computeAllocation(slices: AllocationInput[]): AllocationSlice[] {
  if (slices.length === 0) {
    return [];
  }

  const totals = new Map<string, number>();
  for (const { label, value } of slices) {
    const key = label ?? UNCLASSIFIED_LABEL;
    totals.set(key, (totals.get(key) ?? 0) + value);
  }

  const totalValue = slices.reduce((sum, slice) => sum + slice.value, 0);

  return Array.from(totals.entries())
    .map(([label, value]) => ({
      label,
      value,
      pct: totalValue === 0 ? 0 : (value / totalValue) * 100,
      color: colorForLabel(label),
    }))
    .sort((a, b) => b.value - a.value);
}
