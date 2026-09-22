// `local@domain.tld`: no whitespace, exactly one `@`, and a dot in the domain.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Client-side email format check used by the auth screen.
 * Pure: it does not trim, so callers decide whether to trim first.
 */
export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email);
}
