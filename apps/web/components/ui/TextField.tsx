import type { CSSProperties, InputHTMLAttributes, ReactNode } from "react";

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  /** Inline error message. When set, the input is marked `aria-invalid` and described by it. */
  error?: string;
  /**
   * Optional action rendered inside the error message itself (e.g. the 409's
   * "Sign in instead" button). It lives in the same `aria-describedby` target
   * as `error`, so it's announced as part of the field's error. Ignored when
   * `error` is unset, since there is no error region to render it into.
   */
  errorAction?: ReactNode;
  /** Content absolutely positioned at the input's trailing edge (e.g. `PasswordField`'s toggle). */
  trailing?: ReactNode;
}

// Focus styling needs a pseudo-class, which inline styles can't express, so
// the border colour and the 3px ring live in Tailwind classes (spec →
// Behavior Notes → Layout: `--blue` border plus a 3px ring on focus).
const FOCUS_CLASSES =
  "outline-none focus:border-[var(--blue)] focus:shadow-[0_0_0_3px_rgba(47,111,237,0.14)]";

export function TextField({
  id,
  label,
  error,
  errorAction,
  trailing,
  style,
  className,
  "aria-describedby": ariaDescribedBy,
  ...rest
}: TextFieldProps) {
  const errorId = `${id}-error`;
  const describedBy = [ariaDescribedBy, error ? errorId : undefined].filter(Boolean).join(" ");

  const inputStyle: CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    fontSize: 13.5,
    padding: "11px 13px",
    borderRadius: 10,
    background: "var(--bg-card-alt)",
    color: "var(--text-primary)",
    border: `1px solid ${error ? "var(--red)" : "var(--border)"}`,
    transition: "border-color 120ms ease, box-shadow 120ms ease",
    ...style,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label
        htmlFor={id}
        style={{ fontSize: 11.5, fontWeight: 700, color: "var(--text-secondary)" }}
      >
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={[FOCUS_CLASSES, error ? "focus:border-[var(--red)]" : "", className ?? ""]
            .filter(Boolean)
            .join(" ")}
          style={inputStyle}
          {...rest}
        />
        {trailing}
      </div>
      {error ? (
        <p id={errorId} style={{ margin: 0, fontSize: 11.5, color: "var(--red)" }}>
          {error}
          {errorAction ? <> {errorAction}</> : null}
        </p>
      ) : null}
    </div>
  );
}
