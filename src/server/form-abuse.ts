import "server-only";
import { createHmac, randomBytes } from "node:crypto";

type Form = "quote" | "inquiry";
const MINUTE = 60_000;
const SUBMISSION_WINDOW = 15 * MINUTE;

// Shared by both routes within one process. Queues retain at most 60 attempts and 30 recipients.
export function createFormAbuseControl() {
  const salt = randomBytes(32);
  let attempts: number[] = [];
  let submissions: { at: number; recipient: string }[] = [];

  function reject(form: Form, reason: string, retryAt: number, now: number) {
    console.warn(`[form-abuse] form=${form} outcome=${reason}`);
    const retryAfter = Math.max(1, Math.ceil((retryAt - now) / 1000));
    return Response.json(
      { success: false, error: "RATE_LIMITED", message: `Too many submissions. Please wait ${retryAfter} seconds and try again, or call us directly.` },
      { status: 429, headers: { "Retry-After": String(retryAfter), "Cache-Control": "no-store" } },
    );
  }

  return {
    attempt(form: Form, now = Date.now()) {
      attempts = attempts.filter((at) => now - at < MINUTE);
      if (attempts.length >= 60) return reject(form, "attempt_limit", attempts[0] + MINUTE, now);
      attempts.push(now);
      return null;
    },
    submission(form: Form, email: string, now = Date.now()) {
      submissions = submissions.filter(({ at }) => now - at < SUBMISSION_WINDOW);
      const recipient = createHmac("sha256", salt).update(email.trim().toLowerCase()).digest("hex");
      const matching = submissions.filter((entry) => entry.recipient === recipient);
      if (matching.length >= 3) return reject(form, "recipient_limit", matching[0].at + SUBMISSION_WINDOW, now);
      if (submissions.length >= 30) return reject(form, "submission_limit", submissions[0].at + SUBMISSION_WINDOW, now);
      submissions.push({ at: now, recipient });
      console.info(`[form-abuse] form=${form} outcome=admitted`);
      return null;
    },
  };
}

const globalForFormAbuse = globalThis as unknown as {
  catradersFormAbuse?: ReturnType<typeof createFormAbuseControl>;
};
export const formAbuse = globalForFormAbuse.catradersFormAbuse ??= createFormAbuseControl();
