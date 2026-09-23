import { IsArray, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { ImportSource, ImportStatus, WalletType } from '../../../generated/prisma/client';

/**
 * Body of `POST /data-sources/imports` (data-sources spec.md -> API
 * Contract). No `userId` field exists by design — the row is always scoped
 * to `req.user.id` (CONVENTIONS.md -> "Auth"), so a client can never file an
 * import against someone else's history.
 *
 * `walletType` is only meaningful when `source` is `WALLET`; it's optional
 * rather than conditionally required because `class-validator` expresses
 * "present only for one enum value" poorly, and an ignored `walletType` on a
 * non-wallet row is harmless.
 */
export class CreateImportLogDto {
  @IsEnum(ImportSource)
  source!: ImportSource;

  @IsOptional()
  @IsEnum(WalletType)
  walletType?: WalletType;

  @IsString()
  @IsNotEmpty()
  fileName!: string;

  @IsInt()
  @Min(0)
  records!: number;

  @IsEnum(ImportStatus)
  status!: ImportStatus;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  errors?: string[];
}
