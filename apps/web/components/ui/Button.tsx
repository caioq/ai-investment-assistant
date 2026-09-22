import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./Button.module.css";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "navy";

const VARIANT_STYLES: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    background: "linear-gradient(135deg, var(--emerald), #0ba57a)",
    color: "#fff",
    border: "none",
  },
  secondary: {
    background: "var(--bg-card-alt)",
    color: "var(--text-primary)",
    border: "1px solid var(--border)",
  },
  ghost: {
    background: "transparent",
    color: "var(--text-secondary)",
    border: "none",
  },
  // Auth screen submit (AUTH_UI_SHARED_T-3). The hover lift and its
  // reduced-motion opt-out live in `Button.module.css`, since inline styles
  // can't express `:hover` or media queries.
  navy: {
    background: "linear-gradient(135deg, var(--navy), var(--navy-2))",
    color: "#fff",
    border: "none",
    borderRadius: 11,
    padding: "13px 20px",
    boxShadow: "0 6px 16px rgba(11, 30, 61, 0.25)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  loading = false,
  disabled,
  style,
  className,
  children,
  ...rest
}: ButtonProps) {
  const isNavy = variant === "navy";
  const classNames = [isNavy ? styles.navy : undefined, className]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      disabled={disabled || loading}
      aria-busy={loading}
      className={classNames || undefined}
      style={{
        borderRadius: 10,
        padding: "10px 18px",
        fontSize: 14,
        fontWeight: 700,
        cursor: disabled || loading ? "not-allowed" : "pointer",
        opacity: disabled || loading ? 0.6 : 1,
        ...VARIANT_STYLES[variant],
        ...style,
      }}
      {...rest}
    >
      {isNavy && loading ? (
        <span
          data-testid="button-spinner"
          aria-hidden="true"
          className={styles.spinner}
        />
      ) : null}
      {children}
    </button>
  );
}
