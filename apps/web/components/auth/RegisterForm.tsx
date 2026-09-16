"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "../../lib/api-client";
import { Button } from "../ui/Button";

const UNEXPECTED_ERROR = "Something went wrong. Please try again.";

export function RegisterForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEmailError(null);
    setError(null);
    setIsSubmitting(true);

    try {
      const trimmedName = name.trim();
      await apiFetch("/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          trimmedName === "" ? { email, password } : { email, password, name: trimmedName },
        ),
      });
      router.push("/");
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setEmailError("This email is already registered.");
      } else {
        setError(UNEXPECTED_ERROR);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="register-name">Name</label>
        <input
          id="register-name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>
      <div>
        <label htmlFor="register-email">Email</label>
        <input
          id="register-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        {emailError !== null && (
          <p role="alert">
            {emailError} <a href="/login">Log in instead</a>
          </p>
        )}
      </div>
      <div>
        <label htmlFor="register-password">Password</label>
        <input
          id="register-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </div>
      {error !== null && <p role="alert">{error}</p>}
      <Button type="submit" loading={isSubmitting}>
        Create account
      </Button>
    </form>
  );
}
