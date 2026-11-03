import "server-only";
import { NextResponse } from "next/server";
import type { z } from "zod";
import { toFieldIssues } from "@/lib/validation";
import { verifyTurnstile } from "@/server/turnstile";

export async function readFormBody(req: Request, maxBodyLength: number) {
  const raw = await req.text();
  if (raw.length > maxBodyLength) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: "PAYLOAD_TOO_LARGE", message: "Request body is too large." },
        { status: 413 },
      ),
    } as const;
  }
  try {
    const data: unknown = JSON.parse(raw);
    return { ok: true, data } as const;
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: "INVALID_JSON", message: "Request body must be valid JSON." },
        { status: 400 },
      ),
    } as const;
  }
}

export async function validateFormSubmission<T>(json: unknown, schema: z.ZodType<T>, action: "inquiry" | "quote") {
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return {
      ok: false,
      response: NextResponse.json({
        success: false,
        error: "VALIDATION_FAILED",
        message: "Please correct the highlighted fields.",
        issues: toFieldIssues(parsed.error),
      }, { status: 400 }),
    } as const;
  }
  const token = typeof json === "object" && json !== null
    ? (json as Record<string, unknown>)["cf-turnstile-response"]
    : undefined;
  if (!(await verifyTurnstile(token, action))) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: "VERIFICATION_FAILED", message: "Verification failed. Please try again." },
        { status: 403 },
      ),
    } as const;
  }
  return { ok: true, data: parsed.data } as const;
}
