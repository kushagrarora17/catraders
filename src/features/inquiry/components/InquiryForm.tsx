"use client";

import { type FormEvent, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { SERVICE_AREAS } from "@/features/site/contact";
import { type FieldIssue, toFieldIssues } from "@/lib/validation";
import { HONEYPOT_FIELD, INQUIRY_CATEGORIES, type InquiryResponse, inquirySchema, MAX_MESSAGE_LENGTH } from "../schema";

const FIELD_ORDER = ["name", "business", "city", "phone", "email", "category", "message"] as const;

export function InquiryForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [issues, setIssues] = useState<FieldIssue[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const issueFor = (path: string) => issues.find((i) => i.path === path)?.message;

  function showIssues(next: FieldIssue[]) {
    setIssues(next);
    const first = FIELD_ORDER.find((name) => next.some((i) => i.path === name));
    if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(
      [...FIELD_ORDER, HONEYPOT_FIELD].map((key) => [
        key,
        String(new FormData(form).get(key) ?? ""),
      ]),
    );

    setError(null);
    const parsed = inquirySchema.safeParse(data);
    if (!parsed.success) {
      showIssues(toFieldIssues(parsed.error));
      return;
    }

    setPending(true);
    setIssues([]);
    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = (await res.json()) as InquiryResponse;
      if (body.success) {
        setReference(body.referenceNumber);
        form.reset();
        return;
      }
      showIssues(body.issues ?? []);
      setError(body.message);
    } catch {
      setError("Network error. Please try again, or call us directly.");
    } finally {
      setPending(false);
    }
  }

  if (reference) {
    return (
      <div role="status" className="flex flex-col gap-4 border-l-3 border-primary bg-card p-6">
        <p className="font-heading text-2xl font-bold uppercase text-foreground">Thanks — inquiry received</p>
        <p className="text-muted-foreground">
          Your reference is <strong className="text-foreground">{reference}</strong>. We&apos;ll respond with wholesale
          pricing within 24 hours.
        </p>
        <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => setReference(null)}>
          Send another inquiry
        </Button>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate aria-describedby="inquiry-note" className="flex flex-col gap-5">
      <p id="inquiry-note" className="text-sm text-muted-foreground">
        Fields marked <span className="text-highlight">*</span> are required.
      </p>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="inquiry-name" label="Your Name" required error={issueFor("name")}>
          {(props) => <input {...props} name="name" type="text" autoComplete="name" placeholder="John Smith" />}
        </Field>
        <Field id="inquiry-business" label="Business Name" required error={issueFor("business")}>
          {(props) => (
            <input {...props} name="business" type="text" autoComplete="organization" placeholder="Smith Auto Service" />
          )}
        </Field>
        <Field id="inquiry-phone" label="Phone Number" error={issueFor("phone")}>
          {(props) => (
            <input {...props} name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="(519) 555-0000" />
          )}
        </Field>
        <Field id="inquiry-email" label="Email Address" required error={issueFor("email")}>
          {(props) => (
            <input {...props} name="email" type="email" autoComplete="email" placeholder="you@yourshop.com" />
          )}
        </Field>
      </div>
      <Field id="inquiry-city" label="City" required error={issueFor("city")}>
        {(props) => (
          <input
            {...props}
            name="city"
            type="text"
            autoComplete="address-level2"
            list="inquiry-city-options"
            placeholder="Windsor"
          />
        )}
      </Field>
      <datalist id="inquiry-city-options">
        {SERVICE_AREAS.map((city) => (
          <option key={city} value={city} />
        ))}
      </datalist>
      <Field id="inquiry-category" label="Product Category" error={issueFor("category")}>
        {(props) => (
          <select {...props} name="category" defaultValue="">
            <option value="">— Select a category —</option>
            {INQUIRY_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Field id="inquiry-message" label="Message / Order Details" error={issueFor("message")}>
        {(props) => (
          <textarea
            {...props}
            name="message"
            rows={5}
            maxLength={MAX_MESSAGE_LENGTH}
            placeholder="Tell us what you need — brands, grades, quantities, etc."
          />
        )}
      </Field>

      {/* Honeypot: off-screen and skipped by keyboard and assistive tech. */}
      <div aria-hidden="true" className="sr-only">
        <label htmlFor="inquiry-website">Website</label>
        <input id="inquiry-website" name={HONEYPOT_FIELD} type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" variant="secondary" size="lg" disabled={pending} className="w-full">
        {pending ? "Sending…" : "Send Inquiry"}
        {!pending && <span aria-hidden="true">→</span>}
      </Button>
    </form>
  );
}
