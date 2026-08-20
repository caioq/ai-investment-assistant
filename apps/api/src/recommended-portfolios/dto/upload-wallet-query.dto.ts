import { IsEnum } from 'class-validator';
import { WalletType } from '../../../generated/prisma/client';

/**
 * Query params for `POST /advisor/recommended-portfolios/upload`, per spec.md
 * -> API Contract. `wallet` is explicit rather than inferred from the
 * filename — the export's name is the user's to change, and guessing wrong
 * files one wallet's recommendations under another (spec Behavior Notes /
 * API Contract preamble). Validated by the global `ValidationPipe`
 * (CONVENTIONS.md -> "Module structure"); an unrecognised value 400s via
 * `@IsEnum`.
 */
export class UploadWalletQueryDto {
  @IsEnum(WalletType)
  wallet!: WalletType;
}
