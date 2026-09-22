import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

/**
 * Request body for `POST /auth/register`, per the spec's API Contract.
 * Validated by the global `ValidationPipe` (see CONVENTIONS.md -> "Module structure").
 */
export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;

  /**
   * Required and trimmed (specs/auth/spec.md -> "Amended by auth-ui"): a
   * missing or whitespace-only name fails validation with `400`.
   */
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  name!: string;
}
