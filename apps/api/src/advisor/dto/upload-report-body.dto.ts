import { IsDateString, IsOptional, IsString } from 'class-validator';

/**
 * The non-file fields for `POST /advisor/reports/upload`, per spec.md ->
 * API Contract. This endpoint accepts *either* a multipart PDF *or* a plain
 * JSON `{ sourceName?, text }` body — when a file is attached, `multer`
 * (via `FileInterceptor`) populates `req.body` with these as plain strings
 * before the global `ValidationPipe` runs, same as `UploadWalletBodyDto`
 * (CONVENTIONS.md -> "File uploads"); when no file is attached, this same
 * DTO validates the JSON body directly. `text` is optional here (not
 * `@IsNotEmpty()`) because "file present" is also a valid way to satisfy the
 * endpoint — `AdvisorService.uploadReport` is what enforces "at least one of
 * file/text" and rejects a blank `text`, since that's a cross-field rule the
 * DTO alone can't express against `@UploadedFile()`.
 */
export class UploadReportBodyDto {
  @IsOptional()
  @IsString()
  sourceName?: string;

  @IsOptional()
  @IsString()
  text?: string;

  /**
   * Optional report metadata (data-sources US-5 -> DATA_SOURCES_US-5_T-1).
   * All three are `@IsOptional()` so an existing caller that omits them is
   * still valid; `publishedAt` is `@IsDateString()` (not `@IsDate()`) because
   * both paths deliver it as a string — multipart fields always arrive as
   * plain strings, and JSON has no date type either.
   */
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  publisher?: string;

  @IsOptional()
  @IsDateString()
  publishedAt?: string;
}
