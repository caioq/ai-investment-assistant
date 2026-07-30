import { IsEmail, IsOptional, IsString } from 'class-validator';

/**
 * Request body for `POST /auth/register`, per the spec's API Contract.
 * Validated by the global `ValidationPipe` (see CONVENTIONS.md -> "Module structure").
 */
export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;

  @IsOptional()
  @IsString()
  name?: string;
}
