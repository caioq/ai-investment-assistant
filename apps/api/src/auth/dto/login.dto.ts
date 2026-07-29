import { IsEmail, IsString } from 'class-validator';

/**
 * Request body for `POST /auth/login`, per the spec's API Contract.
 * Validated by the global `ValidationPipe` (see CONVENTIONS.md -> "Module structure").
 */
export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}
