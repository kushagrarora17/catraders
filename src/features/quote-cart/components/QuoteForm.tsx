"use client";

import { type FormEvent, useState } from "react";
import {
  type FieldIssue,
  type QuoteResponse,
  quoteRequestSchema,
  toFieldIssues,
} from "../schema";
import type { QuoteItem } from "../store/useQuoteStore";

interface QuoteFormProps {
  items: QuoteItem[];
  disabled: boolean;
  onSubmitted: (referenceNumber: string) => void;
  onUnavailable: (productIds: string[]) => void;
}

const FIELDS = [
  { name: "name", label: "Name", type: "text", autoComplete: "name", required: true },
  { name: "email", label: "Email", type: "email", autoComplete: "email", required: true },
  { name: "phone", label: "Phone", type: "tel", autoComplete: "tel", required: true },
  { name: "company", label: "Company (optional)", type: "text", autoComplete: "organization", required: false },
] as const;

export function QuoteForm({ items, disabled, onSubmitted, onUnavailable }: QuoteFormProps) {
  const [issues, setIssues] = useState<FieldIssue[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const issueFor = (path: string) => issues.find((i) => i.path === path)?.message;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (key: string) => String(form.get(key) ?? "");

    const parsed = quoteRequestSchema.safeParse({
      customer: { name: text("name"), email: text("email"), phone: text("phone"), company: text("company") },
      items: items.map(({ productId, title, sku, quantity }) => ({ productId, title, sku, quantity })),
      notes: text("notes"),
    });
    if (!parsed.success) {
      setIssues(toFieldIssues(parsed.error));
      setError(null);
      return;
    }

    setPending(true);
    setIssues([]);
    setError(null);
    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const body = (await res.json()) as QuoteResponse;
      if (body.success) {
        onSubmitted(body.referenceNumber);
        return;
      }
      if (body.productIds?.length) onUnavailable(body.productIds);
      setIssues(body.issues ?? []);
      setError(body.message);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  }

  const formIssues = issues.filter((i) => !i.path.startsWith("customer.") && i.path !== "notes");

  return (
    <form onSubmit={handleSubmit} noValidate className="max-w-lg space-y-3 text-sm">
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
              className="w-full rounded-base border border-line bg-transparent px-2 py-1"
            />
            {message && <p className="mt-1 text-brand">{message}</p>}
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
          className="w-full rounded-base border border-line bg-transparent px-2 py-1"
        />
        {issueFor("notes") && <p className="mt-1 text-brand">{issueFor("notes")}</p>}
      </div>

      {(error || formIssues.length > 0) && (
        <div role="alert" className="text-brand">
          {error && <p>{error}</p>}
          {formIssues.map((i) => (
            <p key={`${i.path}-${i.message}`}>{i.message}</p>
          ))}
        </div>
      )}

      <button
        type="submit"
        disabled={disabled || pending}
        className="rounded-base bg-brand px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Submitting…" : "Submit quote request"}
      </button>
    </form>
  );
}
