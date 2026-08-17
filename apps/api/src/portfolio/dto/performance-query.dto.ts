import { IsIn, IsOptional } from 'class-validator';

/**
 * Values `GET /portfolio/performance?range=` accepts, per spec.md -> API
 * Contract. `ALL` means no lower date bound (PORTFOLIO_US-5_T-3). Kept as a
 * single source of truth for both the DTO's `@IsIn` validation and
 * `PortfolioService`'s date-window math, so an unrecognised value 400s
 * (class-validator, behind the global `ValidationPipe`) instead of silently
 * falling through to an unbounded query — same pattern as
 * `ALLOCATION_BY_VALUES` (allocation-query.dto.ts, PORTFOLIO_US-3_T-2).
 */
export const PERFORMANCE_RANGE_VALUES = ['6M', '1Y', 'ALL'] as const;
export type PerformanceRange = (typeof PERFORMANCE_RANGE_VALUES)[number];

/** Values `GET /portfolio/performance?benchmark=` accepts, per spec.md -> API Contract. */
export const PERFORMANCE_BENCHMARK_VALUES = ['IBOVESPA', 'CDI'] as const;
export type PerformanceBenchmark = (typeof PERFORMANCE_BENCHMARK_VALUES)[number];

/**
 * Query params for `GET /portfolio/performance`, per spec.md -> API
 * Contract. Both fields are optional: an omitted `range` defaults to `ALL`
 * (`PortfolioService.getPerformance`), and an omitted `benchmark` means "no
 * comparison" — `benchmarkSeries`/`vsBenchmarkPct` are left out of the
 * response entirely rather than defaulting to a benchmark the user didn't
 * ask for. Validated by the global `ValidationPipe` (CONVENTIONS.md ->
 * "Module structure"); an unrecognised value for either 400s via `@IsIn`.
 */
export class PerformanceQueryDto {
  @IsOptional()
  @IsIn(PERFORMANCE_RANGE_VALUES)
  range?: PerformanceRange;

  @IsOptional()
  @IsIn(PERFORMANCE_BENCHMARK_VALUES)
  benchmark?: PerformanceBenchmark;
}
