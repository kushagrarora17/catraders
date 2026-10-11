import "server-only";

// In-memory sliding window. Per instance only, which is enough to blunt password
// guessing and registration spam while the app runs on a single instance.
const hits = new Map<string, number[]>();
const MAX_KEYS = 10_000;

/** Returns true if the action is allowed, recording it; false once `limit` is hit within `windowMs`. */
export function allowAction(key: string, limit: number, windowMs: number, now = Date.now()) {
  if (hits.size > MAX_KEYS) hits.clear();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}

/** Best-effort client IP behind Azure's front end (X-Forwarded-For entries may carry a port). */
export function getClientIp(req: Request) {
  const first = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (!first) return "unknown";
  return first.startsWith("[") ? first.slice(0, first.indexOf("]") + 1) : first.replace(/:\d+$/, "");
}
