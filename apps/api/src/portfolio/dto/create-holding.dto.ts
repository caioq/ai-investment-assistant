import { IsNumber, IsPositive, IsString, MinLength } from 'class-validator';

/**
 * Request body for `POST /portfolio/holdings`, per spec.md -> API Contract.
 * Validated by the global `ValidationPipe` (CONVENTIONS.md -> "Module
 * structure"). `userId` is never part of this DTO — it always comes from
 * `req.user.id` (spec.md -> API Contract preamble).
 */
export class CreateHoldingDto {
  @IsString()
  @MinLength(1)
  ticker!: string;

  @IsNumber()
  @IsPositive()
  quantity!: number;

  @IsNumber()
  @IsPositive()
  avgPrice!: number;
}
