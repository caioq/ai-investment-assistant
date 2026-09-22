export type PasswordScore = 0 | 1 | 2 | 3 | 4;
export type PasswordStrengthLabel =
  | "Too weak"
  | "Weak"
  | "Fair"
  | "Good"
  | "Strong";

export interface PasswordStrength {
  score: PasswordScore;
  label: PasswordStrengthLabel;
}

const LABELS: readonly PasswordStrengthLabel[] = [
  "Too weak",
  "Weak",
  "Fair",
  "Good",
  "Strong",
];

/**
 * Advisory password strength (spec auth-ui → Password strength meter).
 * Adds 1 per satisfied criterion, then caps at 4. Colours are the web
 * component's concern, not this function's.
 */
export function scorePassword(password: string): PasswordStrength {
  const criteria = [
    password.length >= 8,
    password.length >= 12,
    /[a-z]/.test(password) && /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const raw = criteria.filter(Boolean).length;
  const score = Math.min(raw, 4) as PasswordScore;
  return { score, label: LABELS[score] };
}
