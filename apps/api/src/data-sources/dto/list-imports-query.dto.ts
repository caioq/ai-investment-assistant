import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/** Default `?limit=` for `GET /data-sources/imports` (spec.md -> API Contract). */
export const DEFAULT_IMPORT_LOG_LIMIT = 20;

/** Upper bound, so one request can't pull a user's whole import history. */
export const MAX_IMPORT_LOG_LIMIT = 100;

/**
 * Query params for `GET /data-sources/imports`. A query string value always
 * arrives as a string, and the global `ValidationPipe` has no
 * `transform: true`, so `@Transform` coerces it to a number before `@IsInt`
 * sees it — the same pattern `RegisterDto.name` uses for trimming
 * (CONVENTIONS.md -> "Module structure"); because validator options are set,
 * the controller receives the transformed instance too.
 */
export class ListImportsQueryDto {
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() !== '' ? Number(value) : value,
  )
  @IsInt()
  @Min(1)
  @Max(MAX_IMPORT_LOG_LIMIT)
  limit?: number;
}
