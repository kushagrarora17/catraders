import "server-only";
import { z } from "zod";

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** https everywhere, plus http on loopback (Claude Code's local callback). No fragments. */
export function isAllowedRedirectUri(uri: string) {
  let url: URL;
  try {
    url = new URL(uri);
  } catch {
    return false;
  }
  if (url.hash || url.username || url.password) return false;
  if (url.protocol === "https:") return true;
  return url.protocol === "http:" && LOOPBACK_HOSTS.has(url.hostname);
}

/** RFC 7591 registration request, reduced to what public PKCE clients need. */
export const registrationSchema = z.object({
  redirect_uris: z
    .array(z.string().max(2048).refine(isAllowedRedirectUri, "Redirect URI must be https or loopback http"))
    .min(1)
    .max(10),
  client_name: z.string().trim().max(255).optional(),
  token_endpoint_auth_method: z.literal("none").optional(),
});

/**
 * Loopback redirects may use any port (RFC 8252 §7.3); everything else must match exactly.
 */
export function redirectUriMatches(registered: string[], requested: string) {
  if (registered.includes(requested)) return true;
  let url: URL;
  try {
    url = new URL(requested);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" || !LOOPBACK_HOSTS.has(url.hostname)) return false;
  return registered.some((candidate) => {
    try {
      const other = new URL(candidate);
      return (
        other.protocol === "http:" &&
        other.hostname === url.hostname &&
        other.pathname === url.pathname &&
        other.search === url.search
      );
    } catch {
      return false;
    }
  });
}
