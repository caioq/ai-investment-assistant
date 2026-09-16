import type { ReactNode } from "react";

export type BadgeTone = "positive" | "negative" | "neutral";

const TONE_COLOR: Record<BadgeTone, string> = {
  positive: "var(--emerald)",
  negative: "var(--red)",
  neutral: "var(--text-tertiary)",
};

export interface BadgeProps {
  tone: BadgeTone;
  children: ReactNode;
}

export function Badge({ tone, children }: BadgeProps) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 13,
        fontWeight: 700,
        padding: "4px 10px",
        borderRadius: 20,
        color: TONE_COLOR[tone],
        background: "color-mix(in srgb, currentColor 14%, transparent)",
      }}
    >
      {children}
    </span>
  );
}
