"use client";

import { type FormEvent, useRef, useState } from "react";
import { useFormAnalytics } from "@/lib/useFormAnalytics";
import { Turnstile } from "@/components/Turnstile";
import { IDEMPOTENCY_HEADER } from "@/lib/validation";
import {
  type FieldIssue,
  type QuoteResponse,
  quoteRequestSchema,
  toFieldIssues,
} from "../schema";
import type { QuoteItem } from "../store/useQuoteStore";

interface QuoteFormProps {
  items: QuoteItem[];
  turnstileSiteKey?: string;
  disabled: boolean;
  onSubmitted: (referenceNumber: string) => void;
  onUnavailable: (productIds: string[]) => void;
}

const FIELDS = [
  { name: "name", label: "Name", type: "text", autoComplete: "name", required: true },
  { name: "email", label: "Email", type: "email", autoComplete: "email", required: true },
  { name: "phone", label: "Phone", type: "tel", autoComplete: "tel", required: true },
  { name: "city", label: "City", type: "text", autoComplete: "address-level2", required: true },
  { name: "company", label: "Business name", type: "text", autoComplete: "organization", required: true },
] as const;

export function QuoteForm({ items, disabled, onSubmitted, onUnavailable, turnstileSiteKey }: QuoteFormProps) {
  const analytics = useFormAnalytics("quote");
  const { formRef } = analytics;
  const [verificationAttempt, setVerificationAttempt] = useState(0);
  const [issues, setIssues] = useState<FieldIssue[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  // One key per quote request: retries of the same submission reuse it, so the API stores it once.
  const idempotencyKey = useRef<string | null>(null);

  const issueFor = (path: string) => issues.find((i) => i.path === path)?.message;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    analytics.start();
    analytics.capture("form_submit_attempted");
    const form = new FormData(event.currentTarget);
    const text = (key: string) => String(form.get(key) ?? "");

    const parsed = quoteRequestSchema.safeParse({
      customer: {
        name: text("name"),
        email: text("email"),
        phone: text("phone"),
        city: text("city"),
        company: text("company"),
      },
      items: items.map(({ productId, title, sku, quantity }) => ({ productId, title, sku, quantity })),
      notes: text("notes"),
    });
    if (!parsed.success) {
      analytics.capture("form_submit_failed", { error_type: "validation", fields: parsed.error.issues.map((issue) => issue.path.join(".")) });
      setIssues(toFieldIssues(parsed.error));
      setError(null);
      return;
    }

    const token = text("cf-turnstile-response");
    if (turnstileSiteKey && !token) {
      analytics.capture("form_submit_failed", { error_type: "verification" });
      setError("Please complete the verification before submitting.");
      return;
    }

    setPending(true);
    setIssues([]);
    setError(null);
    idempotencyKey.current ??= crypto.randomUUID();
    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { ...analytics.headers(), "content-type": "application/json", [IDEMPOTENCY_HEADER]: idempotencyKey.current },
        body: JSON.stringify({ ...parsed.data, "cf-turnstile-response": token }),
      });
      const body = (await res.json()) as QuoteResponse;
      if (body.success) {
        onSubmitted(body.referenceNumber);
        return;
      }
      analytics.capture("form_submit_failed", { error_type: body.error, status: res.status });
      if (body.productIds?.length) onUnavailable(body.productIds);
      setIssues(body.issues ?? []);
      setError(body.message);
    } catch {
      analytics.capture("form_submit_failed", { error_type: "network" });
      setError("Network error. Please try again.");
    } finally {
      setVerificationAttempt((attempt) => attempt + 1);
      setPending(false);
    }
  }

  const formIssues = issues.filter((i) => !i.path.startsWith("customer.") && i.path !== "notes");

  return (
    <form ref={formRef} onChange={analytics.start} onSubmit={handleSubmit} noValidate className="max-w-lg space-y-3 text-sm">
      {FIELDS.map((field) => {
        const message = issueFor(`customer.${field.name}`);
        return (
          <div key={field.name}>
            <label htmlFor={field.name} className="mb-1 block font-medium">
              {field.label}
            </label>
            <input
              id={field.name}
              name={field.name}
              type={field.type}
              autoComplete={field.autoComplete}
              required={field.required}
              aria-invalid={Boolean(message)}
              className="w-full rounded-xs border border-border bg-transparent px-2 py-1"
            />
            {message && <p className="mt-1 text-destructive">{message}</p>}
          </div>
        );
      })}
      <div>
        <label htmlFor="notes" className="mb-1 block font-medium">
          Notes (optional)
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          maxLength={2000}
          className="w-full rounded-xs border border-border bg-transparent px-2 py-1"
        />
        {issueFor("notes") && <p className="mt-1 text-destructive">{issueFor("notes")}</p>}
      </div>

      <Turnstile key={verificationAttempt} siteKey={turnstileSiteKey} action="quote" />

      {(error || formIssues.length > 0) && (
        <div role="alert" className="text-destructive">
          {error && <p>{error}</p>}
          {formIssues.map((i) => (
            <p key={`${i.path}-${i.message}`}>{i.message}</p>
          ))}
        </div>
      )}

      <button
        type="submit"
        disabled={disabled || pending}
        className="rounded-xs bg-primary px-4 py-2 text-primary-foreground hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Submitting…" : "Submit quote request"}
      </button>
    </form>
  );
}
