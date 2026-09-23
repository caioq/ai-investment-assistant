"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { isValidEmail } from "@ai-investment-assistant/shared";
import { apiFetch, ApiError } from "../../lib/api-client";
import { TextField } from "../ui/TextField";
import { PasswordField } from "../ui/PasswordField";
import { Button } from "../ui/Button";
import { BrandPanel, FRAUNCES_STACK } from "./BrandPanel";
import { PasswordStrengthMeter } from "./PasswordStrengthMeter";
import { AUTH_CONTENT, type AuthMode } from "./auth-content";

export interface AuthScreenProps {
  startMode: AuthMode;
}

interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
}

const NAME_FIELD_ID = "auth-name";
const EMAIL_FIELD_ID = "auth-email";
const PASSWORD_FIELD_ID = "auth-password";

/** Create account mode's minimum password length — client-side only (spec → Non-Goals). */
const MIN_PASSWORD_LENGTH = 8;

// Server/network error mapping (spec → Behavior Notes → "Server and network
// errors"). The 401 message is deliberately generic — it must never reveal
// whether the email or the password was wrong (spec → Security).
const LOGIN_401_ERROR = "Email or password is incorrect.";
const LOGIN_429_ERROR = "Too many attempts. Please wait a minute and try again.";
const LOGIN_NETWORK_ERROR = "Couldn't reach the server. Please try again.";
// Create account mode. The 409 renders on the Email field rather than as a
// form alert; its "Sign in instead" action needs mode switching and belongs to
// AUTH_UI_US-3_T-2, so only the message itself is rendered here.
const REGISTER_409_ERROR = "This email is already registered.";
const REGISTER_400_ERROR = "Check your details and try again.";

/**
 * The switch line's action is a `<button>`, not a `<Link>` — it switches mode
 * in place rather than navigating (spec → Behavior Notes → Mode switching) —
 * so it's styled to read as the bold link the design shows.
 */
const SWITCH_LINE_BUTTON_STYLE = {
  background: "none",
  border: "none",
  padding: 0,
  font: "inherit",
  fontWeight: 700,
  color: "var(--navy)",
  cursor: "pointer",
  textDecoration: "underline",
} as const;

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

function passwordError(password: string, mode: AuthMode): string | undefined {
  if (password === "") {
    return "Password is required.";
  }
  if (mode === "signup" && password.length < MIN_PASSWORD_LENGTH) {
    return "Use at least 8 characters.";
  }
  return undefined;
}

function nameError(name: string): string | undefined {
  return name.trim() === "" ? "Name is required." : undefined;
}

/**
 * The redesigned Sign in / Create account screen (spec: specs/auth-ui/spec.md).
 * `startMode` selects which mode is rendered: `signin` (AUTH_UI_US-1_T-1/T-2)
 * and `signup` (AUTH_UI_US-2_T-4 — Name field, 8-character rule, advisory
 * strength meter, `POST /auth/register`). `startMode` only seeds the mode:
 * switching afterwards happens in place (AUTH_UI_US-3_T-1). The 409's
 * "Sign in instead" action is AUTH_UI_US-3_T-2.
 */
export function AuthScreen({ startMode }: AuthScreenProps) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>(startMode);
  const content = AUTH_CONTENT[mode];
  const titleRef = useRef<HTMLHeadingElement>(null);

  const isSignup = mode === "signup";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | undefined>(undefined);

  /**
   * Switch mode in place (spec → Behavior Notes → Mode switching). The URL is
   * updated with `window.history.replaceState`, never `router.replace`: a
   * router navigation renders the other `page.tsx`, which mounts a fresh
   * `AuthScreen` and loses everything the visitor typed. `name`, `email` and
   * `password` are kept in state (`name` even while hidden); only the
   * touched/error state is cleared so errors don't carry across modes.
   */
  function switchMode(next: AuthMode) {
    if (next === mode) return;

    setMode(next);
    setSubmitted(false);
    setErrors({});
    setFormError(undefined);

    window.history.replaceState(null, "", next === "signin" ? "/login" : "/register");

    // The <h1> is the same DOM node across the re-render, so focusing it now
    // lands on the new mode's title once React commits (spec → Accessibility).
    titleRef.current?.focus();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Re-entry guard (CONVENTIONS.md → "Disable-and-guard a button that
    // triggers a paid API call"): the submit button is also `disabled` while
    // `isSubmitting`, but a disabled button doesn't stop a form re-submitting
    // via Enter in a text field, so the handler itself must refuse too.
    if (isSubmitting) return;

    setSubmitted(true);

    const nextErrors: FieldErrors = {
      name: isSignup ? nameError(name) : undefined,
      email: emailError(email),
      password: passwordError(password, mode),
    };
    setErrors(nextErrors);

    // Focus the first invalid field in DOM order (spec → Behavior Notes →
    // Validation). `TextField`/`PasswordField` don't forward refs, but each
    // field's `id` is stable, so `getElementById` reaches the real <input>.
    if (nextErrors.name) {
      document.getElementById(NAME_FIELD_ID)?.focus();
      return;
    }
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
      const body = isSignup
        ? { email: email.trim(), password, name: name.trim() }
        : { email: email.trim(), password };
      await apiFetch(isSignup ? "/auth/register" : "/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      router.push("/");
      router.refresh();
    } catch (err) {
      const status = err instanceof ApiError ? err.status : undefined;
      if (isSignup && status === 409) {
        // On the Email field, not the form alert (spec → Server and network errors).
        setErrors((prev) => ({ ...prev, email: REGISTER_409_ERROR }));
      } else if (isSignup && status === 400) {
        setFormError(REGISTER_400_ERROR);
      } else if (!isSignup && status === 401) {
        setFormError(LOGIN_401_ERROR);
      } else if (status === 429) {
        setFormError(LOGIN_429_ERROR);
      } else {
        setFormError(LOGIN_NETWORK_ERROR);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleNameChange(event: ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;
    setName(value);
    if (submitted) {
      setErrors((prev) => ({ ...prev, name: nameError(value) }));
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
      setErrors((prev) => ({ ...prev, password: passwordError(value, mode) }));
    }
  }

  const liveMessage = [errors.name, errors.email, errors.password]
    .filter(Boolean)
    .join(" ");

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
              onClick={() => switchMode("signin")}
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
              onClick={() => switchMode("signup")}
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
            ref={titleRef}
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
              {isSignup && (
                <TextField
                  id={NAME_FIELD_ID}
                  label="Name"
                  type="text"
                  autoComplete="name"
                  placeholder="Ana Souza"
                  value={name}
                  onChange={handleNameChange}
                  error={errors.name}
                />
              )}
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
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <PasswordField
                  id={PASSWORD_FIELD_ID}
                  label="Password"
                  autoComplete={isSignup ? "new-password" : "current-password"}
                  placeholder={isSignup ? "At least 8 characters" : "Enter your password"}
                  value={password}
                  onChange={handlePasswordChange}
                  error={errors.password}
                />
                {isSignup && <PasswordStrengthMeter password={password} />}
              </div>
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
              {isSignup
                ? isSubmitting
                  ? "Creating account"
                  : "Create account"
                : isSubmitting
                  ? "Signing in"
                  : "Sign in"}
            </Button>
          </form>

          <p style={{ fontSize: 13, textAlign: "center", marginTop: 20 }}>
            {isSignup ? (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("signin")}
                  style={SWITCH_LINE_BUTTON_STYLE}
                >
                  Sign in
                </button>
              </>
            ) : (
              <>
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("signup")}
                  style={SWITCH_LINE_BUTTON_STYLE}
                >
                  Create one
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </>
  );
}
