import { captureFormSubmission } from "@/server/form-analytics";
import { after, type NextRequest, NextResponse } from "next/server";
import { type QuoteResponse, quoteRequestSchema } from "@/features/quote-cart/schema";
import { readFormBody, validateFormSubmission } from "@/server/form-request";
import { IDEMPOTENCY_HEADER, parseIdempotencyKey } from "@/lib/validation";
import { sendQuoteEmails } from "@/server/quotes/email";
import { submitQuoteRequest } from "@/server/quotes/service";
import { formAbuse } from "@/server/form-abuse";

const MAX_BODY_BYTES = 100_000;

const respond = (body: QuoteResponse, status: number) => NextResponse.json(body, { status });

export async function POST(req: NextRequest) {
  const limited = formAbuse.attempt("quote");
  if (limited) return limited;
  const body = await readFormBody(req, MAX_BODY_BYTES);
  if (!body.ok) return body.response;
  const json = body.data;

  const parsed = await validateFormSubmission(json, quoteRequestSchema, "quote");
  if (!parsed.ok) return parsed.response;
  const submissionLimited = formAbuse.submission("quote", parsed.data.customer.email);
  if (submissionLimited) return submissionLimited;

  try {
    const idempotencyKey = parseIdempotencyKey(req.headers.get(IDEMPOTENCY_HEADER));
    const result = await submitQuoteRequest(parsed.data, idempotencyKey);
    if (!result.ok) {
      const message = "Some products are no longer available.";
      return respond({ success: false, error: result.error, message, productIds: result.productIds }, result.status);
    }

    if (!result.duplicate) after(() => sendQuoteEmails(result.referenceNumber, result.quote));
    if (!result.duplicate) after(() => captureFormSubmission(req, "quote"));

    return respond(
      {
        success: true,
        referenceNumber: result.referenceNumber,
        message: "Quote request successfully submitted.",
      },
      result.duplicate ? 200 : 201,
    );
  } catch (error) {
    console.error("[quotes] Failed to submit quote request", error);
    return respond({ success: false, error: "INTERNAL_ERROR", message: "Something went wrong. Please try again." }, 500);
  }
}
