import { IsOptional, IsString } from 'class-validator';

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
}
