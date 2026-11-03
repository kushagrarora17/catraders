import "server-only";
import type { NextRequest } from "next/server";

export async function captureFormSubmission(req: NextRequest, formType: "inquiry" | "quote") {
  const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  const distinctId = req.headers.get("X-POSTHOG-DISTINCT-ID");
  if (!token || !distinctId || distinctId.length > 200 || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(req.nextUrl.hostname)) return;
  try {
    const response = await fetch(new URL("/i/v0/e/", process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://m.caelitelube.com"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        api_key: token,
        distinct_id: distinctId,
        event: "form_submitted",
        properties: {
          form_type: formType,
          $session_id: req.headers.get("X-POSTHOG-SESSION-ID")?.slice(0, 200),
          $host: req.nextUrl.hostname,
          $process_person_profile: false,
        },
      }),
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) console.error("[analytics] Submission capture failed", response.status);
  } catch {
    console.error("[analytics] Submission capture failed");
  }
}
