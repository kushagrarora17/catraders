import { getDb } from "@/server/db";
import { ACCESS_TOKEN_TTL_SECONDS, isMcpConfigured, MCP_SCOPE } from "@/server/oauth/config";
import { oauthError, oauthJson, oauthPreflight } from "@/server/oauth/http";
import { verifyPkceS256 } from "@/server/oauth/pkce";
import {
  consumeAuthorizationCode,
  createRefreshToken,
  findClient,
  rotateRefreshToken,
} from "@/server/oauth/repository";
import { signAccessToken } from "@/server/oauth/tokens";

const field = (form: FormData, name: string) => {
  const value = form.get(name);
  return typeof value === "string" && value ? value : undefined;
};

function tokenResponse(accessToken: string, refreshToken: string) {
  return oauthJson({
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: ACCESS_TOKEN_TTL_SECONDS,
    refresh_token: refreshToken,
    scope: MCP_SCOPE,
  });
}

/** POST /oauth/token — authorization_code (PKCE) and refresh_token grants for public clients. */
export async function POST(req: Request) {
  if (!isMcpConfigured()) return oauthError("server_error", "MCP access is not configured", 503);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return oauthError("invalid_request", "Body must be application/x-www-form-urlencoded");
  }

  const db = getDb();
  const clientId = field(form, "client_id");
  if (!clientId) return oauthError("invalid_request", "client_id is required");
  if (!(await findClient(db, clientId))) return oauthError("invalid_client", "Unknown client", 401);

  const grantType = field(form, "grant_type");

  if (grantType === "authorization_code") {
    const code = field(form, "code");
    const verifier = field(form, "code_verifier");
    const redirectUri = field(form, "redirect_uri");
    if (!code || !verifier || !redirectUri) {
      return oauthError("invalid_request", "code, code_verifier and redirect_uri are required");
    }

    const grant = await consumeAuthorizationCode(db, code);
    if (
      !grant ||
      grant.clientId !== clientId ||
      grant.redirectUri !== redirectUri ||
      !verifyPkceS256(verifier, grant.codeChallenge)
    ) {
      return oauthError("invalid_grant", "Authorization code is invalid, expired or already used");
    }
    const resource = field(form, "resource");
    if (resource && resource.replace(/\/+$/, "") !== grant.resource.replace(/\/+$/, "")) {
      return oauthError("invalid_target", "resource does not match the authorization request");
    }

    const [accessToken, refreshToken] = await Promise.all([
      signAccessToken({ clientId, resource: grant.resource }),
      createRefreshToken(db, { clientId, resource: grant.resource }),
    ]);
    return tokenResponse(accessToken, refreshToken);
  }

  if (grantType === "refresh_token") {
    const refreshToken = field(form, "refresh_token");
    if (!refreshToken) return oauthError("invalid_request", "refresh_token is required");

    const rotated = await rotateRefreshToken(db, refreshToken, clientId);
    if (!rotated) return oauthError("invalid_grant", "Refresh token is invalid or expired");

    const accessToken = await signAccessToken({ clientId, resource: rotated.resource });
    return tokenResponse(accessToken, rotated.refreshToken);
  }

  return oauthError("unsupported_grant_type", "Use authorization_code or refresh_token");
}

export const OPTIONS = oauthPreflight;
