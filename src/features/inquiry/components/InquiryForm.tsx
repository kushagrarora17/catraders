"use client";

import { type FormEvent, useRef, useState } from "react";
import { useFormAnalytics } from "@/lib/useFormAnalytics";
import { Turnstile } from "@/components/Turnstile";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { useHydrated } from "@/lib/useHydrated";
import { type FieldIssue, IDEMPOTENCY_HEADER, toFieldIssues } from "@/lib/validation";
import { HONEYPOT_FIELD, INQUIRY_CATEGORIES, type InquiryResponse, inquirySchema, MAX_MESSAGE_LENGTH } from "../schema";

const FIELD_ORDER = ["name", "business", "city", "phone", "email", "category", "message"] as const;

const formText = (form: FormData, key: string) => String(form.get(key) ?? "");
const verificationMissing = (siteKey: string | undefined, token: string) => siteKey && !token;
const createdInquiry = (status: number, data: Record<string, string>) => status === 201 && !data[HONEYPOT_FIELD];
const responseIssues = (body: Exclude<InquiryResponse, {success: true}>) => body.issues ?? [];

/** Value of the drop-down's last option. Choosing it swaps in a free-text field named `city`. */
const OTHER_CITY = "__other__";

type CityProps = {cityOptions: string[]; otherCity: boolean; setOtherCity: (value: boolean) => void; error?: string};

function CitySelect({cityOptions, otherCity, setOtherCity, error}: CityProps) {
  return (
          <Field id="inquiry-city" label="City" required error={otherCity ? undefined : error}>
            {(props) => (
              <select
                {...props}
                name={otherCity ? undefined : "city"}
                defaultValue=""
                onChange={(event) => setOtherCity(event.target.value === OTHER_CITY)}
              >
                <option value="">— Select your city —</option>
                {cityOptions.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
                <option value={OTHER_CITY}>Others</option>
              </select>
            )}
          </Field>
  );
}

function InquiryCity({cityOptions, otherCity, setOtherCity, error}: CityProps) {
  return <>
      {cityOptions.length ? (
        <>
          <CitySelect cityOptions={cityOptions} otherCity={otherCity} setOtherCity={setOtherCity} error={error} />
          {/* Mounted by picking "Others", so autofocus follows the user's own action. */}
          {otherCity && (
            <Field id="inquiry-city-other" label="Your City" required error={error}>
              {(props) => <input {...props} name="city" type="text" autoComplete="address-level2" autoFocus />}
            </Field>
          )}
        </>
      ) : (
        <Field id="inquiry-city" label="City" required error={error}>
          {(props) => <input {...props} name="city" type="text" autoComplete="address-level2" placeholder="Windsor" />}
        </Field>
      )}
  </>;
}

const submitLabel = (hydrated: boolean, pending: boolean) => !hydrated ? "Loading…" : pending ? "Sending…" : "Send Inquiry";

function InquirySubmit({hydrated, pending}: {hydrated: boolean; pending: boolean}) {
  const ready = hydrated && !pending;
  return (
      <Button type="submit" variant="secondary" size="lg" disabled={!ready} className="w-full">
        {submitLabel(hydrated, pending)}
        {ready && <span aria-hidden="true">→</span>}
      </Button>
  );
}

/** `cities` are the service-area cities from Sanity; without any, City is a plain text field. */
export function InquiryForm({ cities, turnstileSiteKey }: { cities: string[]; turnstileSiteKey?: string }) {
  const analytics = useFormAnalytics("inquiry");
  const { formRef } = analytics;
  // One key per inquiry: retries of the same submission reuse it, so the API stores it once.
  const idempotencyKey = useRef<string | null>(null);
  const [verificationAttempt, setVerificationAttempt] = useState(0);
  const hydrated = useHydrated();
  const [issues, setIssues] = useState<FieldIssue[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [otherCity, setOtherCity] = useState(false);
  const cityOptions = [...cities].sort((a, b) => a.localeCompare(b, "en-CA"));

  const issueFor = (path: string) => issues.find((i) => i.path === path)?.message;

  function showIssues(next: FieldIssue[]) {
    setIssues(next);
    const first = FIELD_ORDER.find((name) => next.some((i) => i.path === name));
    if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    analytics.start();
    analytics.capture("form_submit_attempted");
    const form = event.currentTarget;
    const data = Object.fromEntries(
      [...FIELD_ORDER, HONEYPOT_FIELD].map((key) => [
        key,
        formText(new FormData(form), key),
      ]),
    );

    setError(null);
    const parsed = inquirySchema.safeParse(data);
    if (!parsed.success) {
      analytics.capture("form_submit_failed", { error_type: "validation", fields: parsed.error.issues.map((issue) => issue.path.join(".")) });
      showIssues(toFieldIssues(parsed.error));
      return;
    }

    const token = formText(new FormData(form), "cf-turnstile-response");
    if (verificationMissing(turnstileSiteKey, token)) {
      analytics.capture("form_submit_failed", { error_type: "verification" });
      setError("Please complete the verification before submitting.");
      return;
    }

    await submitInquiry(form, data, token);
  }

  const submissionKey = () => idempotencyKey.current ??= crypto.randomUUID();

  async function submitInquiry(form: HTMLFormElement, data: Record<string, string>, token: string) {
    setPending(true);
    setIssues([]);
    const key = submissionKey();
    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { ...analytics.headers(), "content-type": "application/json", [IDEMPOTENCY_HEADER]: key },
        body: JSON.stringify({ ...data, "cf-turnstile-response": token }),
      });
      const body = (await res.json()) as InquiryResponse;
      if (body.success) {
        if (createdInquiry(res.status, data)) analytics.lead();
        setReference(body.referenceNumber);
        idempotencyKey.current = null;
        form.reset();
        setOtherCity(false);
        return;
      }
      analytics.capture("form_submit_failed", { error_type: body.error, status: res.status });
      showIssues(responseIssues(body));
      setError(body.message);
    } catch {
      analytics.capture("form_submit_failed", { error_type: "network" });
      setError("Network error. Please try again, or call us directly.");
    } finally {
      setVerificationAttempt((attempt) => attempt + 1);
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
        <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => { analytics.reset(); setReference(null); }}>
          Send another inquiry
        </Button>
      </div>
    );
  }

  return (
    <form ref={formRef} onChange={analytics.start} onSubmit={handleSubmit} noValidate aria-describedby="inquiry-note" className="flex flex-col gap-5">
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
        <Field id="inquiry-phone" label="Phone Number" required error={issueFor("phone")}>
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
      <InquiryCity cityOptions={cityOptions} otherCity={otherCity} setOtherCity={setOtherCity} error={issueFor("city")} />
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

      <Turnstile key={verificationAttempt} siteKey={turnstileSiteKey} action="inquiry" />

      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}

      <InquirySubmit hydrated={hydrated} pending={pending} />
    </form>
  );
}
