import { IsIn } from 'class-validator';

/**
 * The five groupings `GET /portfolio/allocation?by=` accepts, per spec.md ->
 * API Contract. Kept as a single source of truth for both the DTO's
 * `@IsIn` validation and `PortfolioService.getAllocation`'s label switch, so
 * an unrecognised value 400s (class-validator, behind the global
 * `ValidationPipe`) instead of silently falling through to one grouping or a
 * single "Unclassified" slice.
 */
export const ALLOCATION_BY_VALUES = [
  'sector',
  'subsector',
  'stock',
  'investmentStyle',
  'riskRating',
] as const;

export type AllocationBy = (typeof ALLOCATION_BY_VALUES)[number];

/**
 * Query params for `GET /portfolio/allocation`, per spec.md -> API Contract.
 * Validated by the global `ValidationPipe` (CONVENTIONS.md -> "Module
 * structure").
 */
export class AllocationQueryDto {
  @IsIn(ALLOCATION_BY_VALUES)
  by!: AllocationBy;
}
