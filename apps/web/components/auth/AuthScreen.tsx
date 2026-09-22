"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { isValidEmail } from "@ai-investment-assistant/shared";
import { TextField } from "../ui/TextField";
import { PasswordField } from "../ui/PasswordField";
import { Button } from "../ui/Button";
import { BrandPanel, FRAUNCES_STACK } from "./BrandPanel";
import { AUTH_CONTENT, type AuthMode } from "./auth-content";

export interface AuthScreenProps {
  startMode: AuthMode;
}

interface SignInErrors {
  email?: string;
  password?: string;
}

const EMAIL_FIELD_ID = "auth-email";
const PASSWORD_FIELD_ID = "auth-password";

function emailError(email: string): string | undefined {
  const trimmed = email.trim();
  if (trimmed === "") {
    return "Email is required.";
  }
  if (!isValidEmail(trimmed)) {
    return "Enter a valid email address.";
  }
  return undefined;
}

function passwordError(password: string): string | undefined {
  if (password === "") {
    return "Password is required.";
  }
  return undefined;
}

/**
 * The redesigned Sign in / Create account screen (spec: specs/auth-ui/spec.md).
 * `startMode` selects which mode is rendered; this task (AUTH_UI_US-1_T-1)
 * only implements `signin` — Create account mode (Name field, password
 * strength meter) is AUTH_UI_US-2, client-side mode switching without a
 * remount is AUTH_UI_US-3_T-1, and submit/error-mapping against the API is
 * AUTH_UI_US-1_T-2.
 */
export function AuthScreen({ startMode }: AuthScreenProps) {
  const mode: AuthMode = startMode;
  const content = AUTH_CONTENT[mode];

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<SignInErrors>({});

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);

    const nextErrors: SignInErrors = {
      email: emailError(email),
      password: passwordError(password),
    };
    setErrors(nextErrors);

    // Focus the first invalid field in DOM order (spec → Behavior Notes →
    // Validation). `TextField`/`PasswordField` don't forward refs, but each
    // field's `id` is stable, so `getElementById` reaches the real <input>.
    if (nextErrors.email) {
      document.getElementById(EMAIL_FIELD_ID)?.focus();
    } else if (nextErrors.password) {
      document.getElementById(PASSWORD_FIELD_ID)?.focus();
    }

    // Submit/apiFetch wiring, loading state, and server-error mapping are
    // implemented by AUTH_UI_US-1_T-2 — this task stops at client-side
    // validation.
  }

  function handleEmailChange(event: ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;
    setEmail(value);
    if (submitted) {
      setErrors((prev) => ({ ...prev, email: emailError(value) }));
    }
  }

  function handlePasswordChange(event: ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;
    setPassword(value);
    if (submitted) {
      setErrors((prev) => ({ ...prev, password: passwordError(value) }));
    }
  }

  const liveMessage = [errors.email, errors.password].filter(Boolean).join(" ");

  return (
    <>
      <BrandPanel mode={mode} />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "24px",
          overflowY: "auto",
        }}
      >
        <div style={{ width: "100%", maxWidth: 410, padding: "48px 40px" }}>
          <div
            role="group"
            aria-label="Sign in or create account"
            style={{
              display: "flex",
              padding: 4,
              borderRadius: 10,
              background: "var(--bg-card-alt)",
              marginBottom: 24,
            }}
          >
            <button
              type="button"
              aria-pressed={mode === "signin"}
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: 8,
                border: "none",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                background: mode === "signin" ? "var(--bg-card)" : "transparent",
                color: mode === "signin" ? "var(--text-primary)" : "var(--text-secondary)",
                boxShadow: mode === "signin" ? "var(--shadow)" : "none",
              }}
            >
              Sign in
            </button>
            <button
              type="button"
              aria-pressed={mode === "signup"}
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: 8,
                border: "none",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                background: mode === "signup" ? "var(--bg-card)" : "transparent",
                color: mode === "signup" ? "var(--text-primary)" : "var(--text-secondary)",
                boxShadow: mode === "signup" ? "var(--shadow)" : "none",
              }}
            >
              Create account
            </button>
          </div>

          <h1
            tabIndex={-1}
            style={{
              fontFamily: FRAUNCES_STACK,
              fontSize: 27,
              fontWeight: 500,
              margin: "0 0 8px",
              outline: "none",
            }}
          >
            {content.formTitle}
          </h1>
          <p
            style={{
              fontSize: 13.5,
              color: "var(--text-secondary)",
              margin: "0 0 24px",
            }}
          >
            {content.formSubtitle}
          </p>

          <form onSubmit={handleSubmit} noValidate>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <TextField
                id={EMAIL_FIELD_ID}
                label="Email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={handleEmailChange}
                error={errors.email}
              />
              <PasswordField
                id={PASSWORD_FIELD_ID}
                label="Password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={handlePasswordChange}
                error={errors.password}
              />
            </div>

            <div aria-live="polite" className="sr-only">
              {liveMessage}
            </div>

            {/*
              Spec calls for a navy submit button (a `Button` `variant="navy"`
              added by AUTH_UI_SHARED_T-3, not yet a dependency of this task)
              — falls back to the existing `primary` variant until that lands.
            */}
            <Button type="submit" style={{ width: "100%", marginTop: 20 }}>
              Sign in
            </Button>
          </form>

          <p style={{ fontSize: 13, textAlign: "center", marginTop: 20 }}>
            Don&apos;t have an account? <Link href="/register">Create one</Link>
          </p>
        </div>
      </div>
    </>
  );
}
