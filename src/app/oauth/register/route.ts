import { getDb } from "@/server/db";
import { registrationSchema } from "@/server/oauth/clients";
import { isMcpConfigured } from "@/server/oauth/config";
import { oauthError, oauthJson, oauthPreflight } from "@/server/oauth/http";
import { allowAction, getClientIp } from "@/server/oauth/rate-limit";
import { registerClient } from "@/server/oauth/repository";

const MAX_BODY_BYTES = 8 * 1024;

/** POST /oauth/register — RFC 7591 dynamic client registration for public PKCE clients. */
export async function POST(req: Request) {
  if (!isMcpConfigured()) return oauthError("server_error", "MCP access is not configured", 503);
  if (!allowAction(`register:${getClientIp(req)}`, 10, 60 * 60 * 1000)) {
    return oauthError("invalid_request", "Too many registrations; try again later", 429);
  }

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return oauthError("invalid_client_metadata", "Request too large", 413);

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return oauthError("invalid_client_metadata", "Body must be JSON");
  }
  const parsed = registrationSchema.safeParse(body);
  if (!parsed.success) {
    return oauthError("invalid_client_metadata", parsed.error.issues.map((i) => i.message).join("; "));
  }

  const { redirect_uris, client_name } = parsed.data;
  const clientId = await registerClient(getDb(), { clientName: client_name, redirectUris: redirect_uris });
  return oauthJson(
    {
      client_id: clientId,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_name,
      redirect_uris,
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
    },
    201,
  );
}

export const OPTIONS = oauthPreflight;
