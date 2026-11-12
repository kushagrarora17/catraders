import "server-only";
import type { NextRequest } from "next/server";

const posthogHost = () => process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://m.caelitelube.com";
const validDistinctId = (id: string | null): id is string => Boolean(id && id.length <= 200);
const sessionId = (req: NextRequest) => req.headers.get("X-POSTHOG-SESSION-ID")?.slice(0, 200);

function canCapture(token: string | undefined, distinctId: string | null, hostname: string) {
  return Boolean(token) && validDistinctId(distinctId) && !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(hostname);
}

export async function captureFormSubmission(req: NextRequest, formType: "inquiry" | "quote") {
  const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  const distinctId = req.headers.get("X-POSTHOG-DISTINCT-ID");
  if (!canCapture(token, distinctId, req.nextUrl.hostname)) return;
  try {
    const response = await fetch(new URL("/i/v0/e/", posthogHost()), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        api_key: token,
        distinct_id: distinctId,
        event: "form_submitted",
        properties: {
          form_type: formType,
          $session_id: sessionId(req),
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
