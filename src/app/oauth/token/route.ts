import { getDb } from "@/server/db";
import { ACCESS_TOKEN_TTL_SECONDS, isMcpConfigured, MCP_SCOPE } from "@/server/oauth/config";
import { oauthError, oauthJson, oauthPreflight } from "@/server/oauth/http";
import { verifyPkceS256 } from "@/server/oauth/pkce";
import {
  consumeAuthorizationCode,
  createRefreshToken,
  findAuthorizationCode,
  findRefreshToken,
  findClient,
  rotateRefreshToken,
} from "@/server/oauth/repository";
import { signAccessToken } from "@/server/oauth/tokens";
import { isActiveOperator } from "@/server/oauth/operators";
import type { getDb as database } from "@/server/db";

const field = (form: FormData, name: string) => {
  const value = form.get(name);
  return typeof value === "string" && value ? value : undefined;
};

async function operatorRevisionIsCurrent(email: string, revision: string) {
  try {
    return { available: true as const, active: await isActiveOperator(email, revision) };
  } catch {
    return { available: false as const, active: false };
  }
}

function tokenResponse(accessToken: string, refreshToken: string) {
  return oauthJson({
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: ACCESS_TOKEN_TTL_SECONDS,
    refresh_token: refreshToken,
    scope: MCP_SCOPE,
  });
}

async function authorizationCodeGrant(db: ReturnType<typeof database>, form: FormData, clientId: string) {
  const code = field(form, "code");
  const verifier = field(form, "code_verifier");
  const redirectUri = field(form, "redirect_uri");
  if (!code || !verifier || !redirectUri) return oauthError("invalid_request", "code, code_verifier and redirect_uri are required");

  const candidate = await findAuthorizationCode(db, code);
  if (candidate?.operatorEmail && candidate.operatorRevision) {
    const current = await operatorRevisionIsCurrent(candidate.operatorEmail, candidate.operatorRevision);
    if (!current.available) return oauthError("server_error", "Operator authorization is temporarily unavailable", 503);
    if (!current.active) return oauthError("invalid_grant", "Operator access has been revoked", 401);
  }
  const grant = await consumeAuthorizationCode(db, code);
  if (!grant || !grant.operatorEmail || grant.clientId !== clientId || grant.redirectUri !== redirectUri || !verifyPkceS256(verifier, grant.codeChallenge)) {
    return oauthError("invalid_grant", "Authorization code is invalid, expired or already used");
  }
  if (!grant.operatorRevision) return oauthError("invalid_grant", "Operator credentials changed", 401);
  const resource = field(form, "resource");
  if (resource && resource.replace(/\/+$/, "") !== grant.resource.replace(/\/+$/, "")) {
    return oauthError("invalid_target", "resource does not match the authorization request");
  }

  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken({ clientId, resource: grant.resource, operatorEmail: grant.operatorEmail, operatorRevision: grant.operatorRevision }),
    createRefreshToken(db, { clientId, resource: grant.resource, operatorEmail: grant.operatorEmail, operatorRevision: grant.operatorRevision }),
  ]);
  return tokenResponse(accessToken, refreshToken);
}

async function refreshGrant(db: ReturnType<typeof database>, form: FormData, clientId: string) {
  const refreshToken = field(form, "refresh_token");
  if (!refreshToken) return oauthError("invalid_request", "refresh_token is required");
  const current = await findRefreshToken(db, refreshToken, clientId);
  if (!current?.operatorEmail || !current.operatorRevision) return oauthError("invalid_grant", "Refresh token is invalid or expired", 401);
  const active = await operatorRevisionIsCurrent(current.operatorEmail, current.operatorRevision);
  if (!active.available) return oauthError("server_error", "Operator authorization is temporarily unavailable", 503);
  if (!active.active) return oauthError("invalid_grant", "Operator access has been revoked", 401);
  const rotated = await rotateRefreshToken(db, refreshToken, clientId);
  if (!rotated) return oauthError("invalid_grant", "Refresh token is invalid or expired");
  if (!rotated.operatorEmail || !rotated.operatorRevision) return oauthError("invalid_grant", "Refresh token has no active operator", 401);
  const accessToken = await signAccessToken({ clientId, resource: rotated.resource, operatorEmail: rotated.operatorEmail, operatorRevision: rotated.operatorRevision });
  return tokenResponse(accessToken, rotated.refreshToken);
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

  if (grantType === "authorization_code") return authorizationCodeGrant(db, form, clientId);
  if (grantType === "refresh_token") return refreshGrant(db, form, clientId);
  return oauthError("unsupported_grant_type", "Use authorization_code or refresh_token");
}

export const OPTIONS = oauthPreflight;
