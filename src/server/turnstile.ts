import "server-only";

export function getTurnstileSiteKey() {
  if (process.env.NODE_ENV !== "production" && !process.env.TURNSTILE_SECRET_KEY) return undefined;
  return process.env.TURNSTILE_SITE_KEY || "0x4AAAAAAFvcsO65-TpveKn1";
}

export async function verifyTurnstile(token: unknown, action: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return process.env.NODE_ENV !== "production";
  if (typeof token !== "string" || !token || token.length > 2048) return false;

  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, response: token }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return false;
    const result = await response.json();
    const hostname = new URL(process.env.SITE_URL || "https://caelitelube.com").hostname;
    return result.success === true && result.action === action && result.hostname === hostname;
  } catch {
    return false;
  }
}
