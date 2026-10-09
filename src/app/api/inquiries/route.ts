import { after, type NextRequest, NextResponse } from "next/server";
import { HONEYPOT_FIELD, type InquiryResponse, inquirySchema } from "@/features/inquiry/schema";
import { IDEMPOTENCY_HEADER, parseIdempotencyKey, toFieldIssues } from "@/lib/validation";
import { getDb } from "@/server/db";
import { sendInquiryEmails } from "@/server/inquiries/email";
import { insertInquiry } from "@/server/inquiries/repository";
import { generateReferenceNumber } from "@/server/quotes/reference";

const MAX_BODY_BYTES = 20_000;
const SUCCESS_MESSAGE = "Inquiry received. We'll respond within 24 hours.";

const respond = (body: InquiryResponse, status: number) => NextResponse.json(body, { status });

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

  // Honeypot filled in: pretend success so bots don't learn to adapt, but store nothing.
  if (typeof json === "object" && json !== null && (json as Record<string, unknown>)[HONEYPOT_FIELD]) {
    return respond({ success: true, referenceNumber: generateReferenceNumber(new Date(), "INQ"), message: SUCCESS_MESSAGE }, 201);
  }

  const parsed = inquirySchema.safeParse(json);
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
    const inquiry = parsed.data;
    const idempotencyKey = parseIdempotencyKey(req.headers.get(IDEMPOTENCY_HEADER));
    const { referenceNumber, duplicate } = await insertInquiry(getDb(), inquiry, idempotencyKey);
    if (!duplicate) after(() => sendInquiryEmails(referenceNumber, inquiry));
    return respond({ success: true, referenceNumber, message: SUCCESS_MESSAGE }, duplicate ? 200 : 201);
  } catch (error) {
    console.error("[inquiries] Failed to store inquiry", error);
    return respond({ success: false, error: "INTERNAL_ERROR", message: "Something went wrong. Please try again." }, 500);
  }
}
