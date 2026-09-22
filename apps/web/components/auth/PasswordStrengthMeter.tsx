import { scorePassword, type PasswordScore } from "@ai-investment-assistant/shared";

/** Colour token per score (spec auth-ui → Behavior Notes → Password strength meter). */
const SCORE_COLORS: Record<PasswordScore, string> = {
  0: "--red",
  1: "--red",
  2: "--amber",
  3: "--blue",
  4: "--emerald",
};

const EMPTY_HINT = "Use 8+ characters";
const TYPING_HINT = "Mix upper, lower, numbers, and a symbol";

const SEGMENT_COUNT = 4;

/**
 * Advisory password strength meter for Create account mode. Purely visual
 * feedback — it never blocks submission (only the 8-character rule does).
 */
export function PasswordStrengthMeter({ password }: { password: string }) {
  const { score, label } = scorePassword(password);
  const color = `var(${SCORE_COLORS[score]})`;
  const hint = password === "" ? EMPTY_HINT : TYPING_HINT;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div
        aria-hidden="true"
        data-testid="strength-segments"
        style={{ display: "flex", gap: 4 }}
      >
        {Array.from({ length: SEGMENT_COUNT }, (_, index) => (
          <span
            key={index}
            data-testid="strength-segment"
            style={{
              flex: 1,
              height: 4,
              borderRadius: 999,
              background: index < score ? color : "var(--border)",
            }}
          />
        ))}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          fontSize: 12,
        }}
      >
        <span style={{ color: "var(--text-tertiary)" }}>{hint}</span>
        <span style={{ color, fontWeight: 700 }}>{label}</span>
      </div>
    </div>
  );
}
