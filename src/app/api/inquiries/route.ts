import { captureFormSubmission } from "@/server/form-analytics";
import { after, type NextRequest, NextResponse } from "next/server";
import { HONEYPOT_FIELD, type Inquiry, type InquiryResponse, inquirySchema } from "@/features/inquiry/schema";
import { readFormBody, validateFormSubmission } from "@/server/form-request";
import { IDEMPOTENCY_HEADER, parseIdempotencyKey } from "@/lib/validation";
import { getDb } from "@/server/db";
import { sendInquiryEmails } from "@/server/inquiries/email";
import { insertInquiry } from "@/server/inquiries/repository";
import { generateReferenceNumber } from "@/server/quotes/reference";
import { formAbuse } from "@/server/form-abuse";

const MAX_BODY_BYTES = 20_000;
const SUCCESS_MESSAGE = "Inquiry received. We'll respond within 24 hours.";

const respond = (body: InquiryResponse, status: number) => NextResponse.json(body, { status });

const honeypotFilled = (json: unknown) => typeof json === "object" && json !== null && (json as Record<string, unknown>)[HONEYPOT_FIELD];

export async function POST(req: NextRequest) {
  const limited = formAbuse.attempt("inquiry");
  if (limited) return limited;
  const body = await readFormBody(req, MAX_BODY_BYTES);
  if (!body.ok) return body.response;
  const json = body.data;

  // Honeypot filled in: pretend success so bots don't learn to adapt, but store nothing.
  if (honeypotFilled(json)) {
    console.info("[form-abuse] form=inquiry outcome=honeypot");
    return respond({ success: true, referenceNumber: generateReferenceNumber(new Date(), "INQ"), message: SUCCESS_MESSAGE }, 201);
  }

  return validatedInquiry(req, json);
}

async function validatedInquiry(req: NextRequest, json: unknown) {
  const parsed = await validateFormSubmission(json, inquirySchema, "inquiry");
  if (!parsed.ok) return parsed.response;
  const submissionLimited = formAbuse.submission("inquiry", parsed.data.email);
  if (submissionLimited) return submissionLimited;

  return storeInquiry(req, parsed.data);
}

async function storeInquiry(req: NextRequest, inquiry: Inquiry) {
  try {
    const idempotencyKey = parseIdempotencyKey(req.headers.get(IDEMPOTENCY_HEADER));
    const { referenceNumber, duplicate } = await insertInquiry(getDb(), inquiry, idempotencyKey);
    if (!duplicate) {
      after(() => sendInquiryEmails(referenceNumber, inquiry));
      after(() => captureFormSubmission(req, "inquiry"));
    }
    return respond({ success: true, referenceNumber, message: SUCCESS_MESSAGE }, duplicate ? 200 : 201);
  } catch (error) {
    console.error("[inquiries] Failed to store inquiry", error);
    return respond({ success: false, error: "INTERNAL_ERROR", message: "Something went wrong. Please try again." }, 500);
  }
}
