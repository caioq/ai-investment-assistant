"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "../../lib/api-client";
import { Button } from "../ui/Button";

const UNEXPECTED_ERROR = "Something went wrong. Please try again.";
const QUANTITY_ERROR = "Quantity must be greater than zero.";

function extractApiErrorMessage(body: unknown): string {
  if (
    body !== null &&
    typeof body === "object" &&
    "message" in body &&
    (body as { message?: unknown }).message !== undefined
  ) {
    const { message } = body as { message: unknown };
    if (Array.isArray(message)) {
      return message.join(", ");
    }
    if (typeof message === "string") {
      return message;
    }
  }
  return UNEXPECTED_ERROR;
}

export function AddHoldingForm() {
  const router = useRouter();
  const [ticker, setTicker] = useState("");
  const [quantity, setQuantity] = useState("");
  const [avgPrice, setAvgPrice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const numericQuantity = Number(quantity);
    if (!(numericQuantity > 0)) {
      setError(QUANTITY_ERROR);
      return;
    }

    setIsSubmitting(true);

    try {
      await apiFetch("/portfolio/holdings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker: ticker.toUpperCase(),
          quantity: numericQuantity,
          avgPrice: Number(avgPrice),
        }),
      });
      setTicker("");
      setQuantity("");
      setAvgPrice("");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(extractApiErrorMessage(err.body));
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
        <label htmlFor="holding-ticker">Ticker</label>
        <input
          id="holding-ticker"
          type="text"
          value={ticker}
          onChange={(event) => setTicker(event.target.value)}
          required
        />
      </div>
      <div>
        <label htmlFor="holding-quantity">Quantity</label>
        <input
          id="holding-quantity"
          type="number"
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
          required
        />
      </div>
      <div>
        <label htmlFor="holding-avg-price">Average Price</label>
        <input
          id="holding-avg-price"
          type="number"
          value={avgPrice}
          onChange={(event) => setAvgPrice(event.target.value)}
          required
        />
      </div>
      {error !== null && <p role="alert">{error}</p>}
      <Button type="submit" loading={isSubmitting}>
        Add holding
      </Button>
    </form>
  );
}
