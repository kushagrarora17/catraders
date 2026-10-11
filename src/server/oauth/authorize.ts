import "server-only";
import { z } from "zod";
import type { Database } from "@/server/db";
import { redirectUriMatches } from "./clients";
import { getResourceUrl, MCP_SCOPE } from "./config";
import { CHALLENGE_PATTERN } from "./pkce";
import { findClient } from "./repository";

const authorizeSchema = z.object({
  response_type: z.literal("code"),
  client_id: z.string().min(1).max(64),
  redirect_uri: z.string().min(1).max(2048),
  code_challenge: z.string().regex(CHALLENGE_PATTERN),
  code_challenge_method: z.literal("S256"),
  state: z.string().max(2048).optional(),
  resource: z.string().max(2048).optional(),
  scope: z.string().max(256).optional(),
});

export type AuthorizeParams = z.infer<typeof authorizeSchema>;

export type AuthorizeValidation =
  | { ok: true; params: AuthorizeParams; clientName: string; resource: string }
  | { ok: false; message: string };

const normalizeUrl = (value: string) => value.replace(/#.*$/, "").replace(/\/+$/, "");

/**
 * Validates an authorization request. Failures are shown on our own page rather than
 * redirected, so an unvalidated redirect_uri is never trusted with an error response.
 */
export async function validateAuthorizeRequest(
  db: Database,
  input: Record<string, string | undefined>,
): Promise<AuthorizeValidation> {
  const parsed = authorizeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "This sign-in link is invalid or incomplete. Start again from your MCP client." };
  }
  const params = parsed.data;

  const client = await findClient(db, params.client_id);
  if (!client) return { ok: false, message: "Unknown client. Reconnect from your MCP client." };
  if (!redirectUriMatches(client.redirectUris, params.redirect_uri)) {
    return { ok: false, message: "The redirect address does not match the one this client registered." };
  }

  const resource = getResourceUrl().href;
  if (params.resource && normalizeUrl(params.resource) !== normalizeUrl(resource)) {
    return { ok: false, message: "This client asked for access to a different resource." };
  }
  if (params.scope && !params.scope.split(" ").every((s) => s === MCP_SCOPE)) {
    return { ok: false, message: "This client asked for unsupported permissions." };
  }

  return { ok: true, params, clientName: client.clientName || "An MCP client", resource };
}

/** Query string that reproduces an authorization request (used to re-render after a wrong password). */
export function authorizeQuery(params: AuthorizeParams) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== undefined) query.set(key, value);
  return query;
}
