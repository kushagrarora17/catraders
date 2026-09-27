import { after, type NextRequest, NextResponse } from "next/server";
import { type QuoteResponse, quoteRequestSchema, toFieldIssues } from "@/features/quote-cart/schema";
import { sendQuoteEmails } from "@/server/quotes/email";
import { submitQuoteRequest } from "@/server/quotes/service";

const MAX_BODY_BYTES = 100_000;

const respond = (body: QuoteResponse, status: number) => NextResponse.json(body, { status });

export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) {
    return respond({ success: false, error: "PAYLOAD_TOO_LARGE", message: "Request body is too large." }, 413);
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return respond({ success: false, error: "INVALID_JSON", message: "Request body must be valid JSON." }, 400);
  }

  const parsed = quoteRequestSchema.safeParse(json);
  if (!parsed.success) {
    return respond(
      {
        success: false,
        error: "VALIDATION_FAILED",
        message: "Please correct the highlighted fields.",
        issues: toFieldIssues(parsed.error),
      },
      400,
    );
  }

  try {
    const result = await submitQuoteRequest(parsed.data);
    if (!result.ok) {
      const message =
        result.error === "OUT_OF_STOCK"
          ? "Some products are out of stock. Remove them to continue."
          : "Some products are no longer available.";
      return respond({ success: false, error: result.error, message, productIds: result.productIds }, result.status);
    }

    after(() => sendQuoteEmails(result.referenceNumber, result.quote));

    return respond(
      {
        success: true,
        referenceNumber: result.referenceNumber,
        message: "Quote request successfully submitted.",
      },
      201,
    );
  } catch (error) {
    console.error("[quotes] Failed to submit quote request", error);
    return respond({ success: false, error: "INTERNAL_ERROR", message: "Something went wrong. Please try again." }, 500);
  }
}
