import { IsNumber, IsOptional, IsPositive } from 'class-validator';

/**
 * Request body for `PATCH /portfolio/holdings/:id`, per spec.md -> API
 * Contract. Both fields are optional — a partial update must only touch the
 * fields actually present in the request (PORTFOLIO_US-1_T-3), never null
 * out the field it wasn't given. `userId` is never part of this DTO — it
 * always comes from `req.user.id` (spec.md -> API Contract preamble).
 */
export class UpdateHoldingDto {
  @IsOptional()
  @IsNumber()
  @IsPositive()
  quantity?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  avgPrice?: number;
}
