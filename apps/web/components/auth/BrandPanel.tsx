import { AUTH_CONTENT, PRODUCT_NAME, TRUST_SIGNALS, type AuthMode } from "./auth-content";

/** Fraunces is loaded by `app/(auth)/layout.tsx` only (see CONVENTIONS.md → "Design tokens"). */
export const FRAUNCES_STACK = "var(--font-fraunces), Georgia, serif";

/** The 36×36 translucent logo mark shared by the brand panel and the compact header. */
export function LogoMark({ tone = "light" }: { tone?: "light" | "dark" }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 36,
        height: 36,
        borderRadius: 10,
        flexShrink: 0,
        background:
          tone === "light"
            ? "rgba(255, 255, 255, 0.12)"
            : "linear-gradient(155deg, var(--navy), var(--navy-2))",
        border: tone === "light" ? "1px solid rgba(255, 255, 255, 0.18)" : "none",
        color: "#fff",
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path
          d="M4 17l5-5 4 4 7-8"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function CheckCircle() {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 20,
        height: 20,
        borderRadius: "50%",
        flexShrink: 0,
        background: "rgba(14, 165, 121, 0.22)",
        color: "var(--emerald)",
      }}
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
        <path
          d="M5 12.5l4.5 4.5L19 7.5"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

/**
 * Left column of the auth screen: navy gradient panel with the product
 * wordmark, the mode's headline/paragraph/value points, and the trust row.
 * Hidden below 900px, where the compact `AuthCompactBrand` takes over.
 */
export function BrandPanel({ mode }: { mode: AuthMode }) {
  const content = AUTH_CONTENT[mode];

  return (
    <aside
      data-testid="brand-panel"
      className="hidden min-[900px]:flex"
      style={{
        // Explicit placement so the layout's grid always puts the panel in
        // the left column, whatever order the page renders its children in.
        gridColumn: 1,
        gridRow: 1,
        alignSelf: "stretch",
        position: "relative",
        overflow: "hidden",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: 40,
        padding: "48px 56px",
        color: "#fff",
        background: "linear-gradient(155deg, var(--navy), var(--navy-2))",
      }}
    >
      {/* Decorative radial blurs, clipped by the panel's overflow: hidden. */}
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          top: -140,
          right: -120,
          width: 380,
          height: 380,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(47, 111, 237, 0.45), transparent 70%)",
          filter: "blur(40px)",
          pointerEvents: "none",
        }}
      />
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          bottom: -160,
          left: -120,
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(14, 165, 121, 0.35), transparent 70%)",
          filter: "blur(40px)",
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 12 }}>
        <LogoMark />
        <span style={{ fontFamily: FRAUNCES_STACK, fontSize: 18, fontWeight: 600 }}>
          {PRODUCT_NAME}
        </span>
      </div>

      <div style={{ position: "relative", maxWidth: 460 }}>
        <h2
          style={{
            fontFamily: FRAUNCES_STACK,
            fontSize: 34,
            fontWeight: 500,
            lineHeight: 1.15,
            margin: 0,
          }}
        >
          {content.brandHeadline}
        </h2>
        <p
          style={{
            fontSize: 14.5,
            lineHeight: 1.6,
            color: "rgba(255, 255, 255, 0.78)",
            margin: "16px 0 28px",
          }}
        >
          {content.brandParagraph}
        </p>
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 12 }}>
          {content.valuePoints.map((point) => (
            <li
              key={point}
              style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13.5 }}
            >
              <CheckCircle />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>

      <ul
        style={{
          position: "relative",
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "flex",
          flexWrap: "wrap",
          gap: "8px 20px",
          fontSize: 11.5,
          // Spec → Accessibility → Contrast: at least 60% white at 11.5px.
          color: "rgba(255, 255, 255, 0.72)",
        }}
      >
        {TRUST_SIGNALS.map((signal, index) => (
          <li key={signal} style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
            {index === 0 && (
              <span
                aria-hidden="true"
                data-testid="trust-pulse-dot"
                // `motion-safe:` keeps the dot static under prefers-reduced-motion: reduce.
                className="motion-safe:animate-pulse"
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "var(--emerald)",
                }}
              />
            )}
            <span>{signal}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}

/** Compact logo + product name shown above the form column below 900px. */
export function AuthCompactBrand() {
  return (
    <div
      data-testid="auth-compact-brand"
      className="flex min-[900px]:hidden"
      style={{
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        padding: "32px 24px 0",
        color: "var(--text-primary)",
      }}
    >
      <LogoMark tone="dark" />
      <span style={{ fontFamily: FRAUNCES_STACK, fontSize: 18, fontWeight: 600 }}>
        {PRODUCT_NAME}
      </span>
    </div>
  );
}
