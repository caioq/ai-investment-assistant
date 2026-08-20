import { IsDateString, IsOptional, IsString } from 'class-validator';

/**
 * The non-file multipart form fields for `POST
 * /advisor/recommended-portfolios/upload`, per spec.md -> API Contract.
 * `multer` (via `FileInterceptor`) populates `req.body` with these as plain
 * strings before the global `ValidationPipe` runs, same as any other `@Body`
 * DTO (CONVENTIONS.md -> "Module structure" / "File uploads"). Both fields
 * are optional: an omitted `effectiveDate` defaults to today
 * (`parseEffectiveDate`, `wallet-date.ts`), and an omitted `sourceName`
 * simply isn't stored.
 */
export class UploadWalletBodyDto {
  @IsOptional()
  @IsDateString()
  effectiveDate?: string;

  @IsOptional()
  @IsString()
  sourceName?: string;
}
