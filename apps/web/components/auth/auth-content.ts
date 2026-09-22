/**
 * Copy for the auth screen (spec: specs/auth-ui/spec.md → Behavior Notes →
 * Content per mode). Copied verbatim from the spec — every claim here must
 * stay true of this app, so edit the spec first, then this file.
 */

export type AuthMode = "signin" | "signup";

/** Placeholder product name (spec → Open Questions); change it only here. */
export const PRODUCT_NAME = "AI Investment Assistant";

/** Trust row, identical in both modes. The first gets the pulsing dot. */
export const TRUST_SIGNALS = [
  "Securely hashed passwords",
  "No brokerage access",
  "Private to your account",
] as const;

export interface AuthModeContent {
  formTitle: string;
  formSubtitle: string;
  brandHeadline: string;
  brandParagraph: string;
  valuePoints: readonly [string, string, string];
}

export const AUTH_CONTENT: Record<AuthMode, AuthModeContent> = {
  signin: {
    formTitle: "Welcome back",
    formSubtitle: "Sign in to review your portfolio and latest analysis.",
    brandHeadline: "Your whole portfolio, in one clear view.",
    brandParagraph:
      "Track allocation and performance, and get portfolio reviews grounded in your research house's analysis.",
    valuePoints: [
      "Allocation by sector, stock, investment style, and risk",
      "Performance measured against Ibovespa and CDI",
      "AI portfolio reviews: strengths, risks, and recommendations",
    ],
  },
  signup: {
    formTitle: "Create your account",
    formSubtitle: "A few details and your dashboard is ready.",
    brandHeadline: "Start with clarity, not spreadsheets.",
    brandParagraph:
      "Upload your B3 holdings as a CSV and get allocation insight and a research-backed review in minutes.",
    valuePoints: [
      "Import your holdings from a simple CSV file",
      "Compare against your research house's model portfolios",
      "No brokerage credentials needed, ever",
    ],
  },
};
