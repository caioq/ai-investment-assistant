"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isValidEmail } from "@ai-investment-assistant/shared";
import { apiFetch, ApiError } from "../../lib/api-client";
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

// Server/network error mapping (spec → Behavior Notes → "Server and network
// errors"). The 401 message is deliberately generic — it must never reveal
// whether the email or the password was wrong (spec → Security).
const LOGIN_401_ERROR = "Email or password is incorrect.";
const LOGIN_429_ERROR = "Too many attempts. Please wait a minute and try again.";
const LOGIN_NETWORK_ERROR = "Couldn't reach the server. Please try again.";

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
  const router = useRouter();
  const mode: AuthMode = startMode;
  const content = AUTH_CONTENT[mode];

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<SignInErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | undefined>(undefined);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Re-entry guard (CONVENTIONS.md → "Disable-and-guard a button that
    // triggers a paid API call"): the submit button is also `disabled` while
    // `isSubmitting`, but a disabled button doesn't stop a form re-submitting
    // via Enter in a text field, so the handler itself must refuse too.
    if (isSubmitting) return;

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
      return;
    }
    if (nextErrors.password) {
      document.getElementById(PASSWORD_FIELD_ID)?.focus();
      return;
    }

    setFormError(undefined);
    setIsSubmitting(true);
    try {
      await apiFetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      router.push("/");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setFormError(LOGIN_401_ERROR);
      } else if (err instanceof ApiError && err.status === 429) {
        setFormError(LOGIN_429_ERROR);
      } else {
        setFormError(LOGIN_NETWORK_ERROR);
      }
    } finally {
      setIsSubmitting(false);
    }
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

            {formError && (
              <p
                role="alert"
                style={{
                  color: "var(--red)",
                  fontSize: 13.5,
                  margin: "14px 0 0",
                }}
              >
                {formError}
              </p>
            )}

            <Button
              type="submit"
              variant="navy"
              loading={isSubmitting}
              style={{ width: "100%", marginTop: 20 }}
            >
              {isSubmitting ? "Signing in" : "Sign in"}
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
