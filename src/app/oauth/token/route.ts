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

type Database = ReturnType<typeof database>;
type CodeGrant = NonNullable<Awaited<ReturnType<typeof consumeAuthorizationCode>>>;
type OperatorCodeGrant = CodeGrant & { operatorEmail: string };

function hasOperatorCredentials<T extends { operatorEmail?: string | null; operatorRevision?: string | null }>(grant: T | null): grant is T & { operatorEmail: string; operatorRevision: string } {
  return Boolean(grant?.operatorEmail && grant.operatorRevision);
}

async function operatorError(email: string, revision: string) {
  const current = await operatorRevisionIsCurrent(email, revision);
  if (!current.available) return oauthError("server_error", "Operator authorization is temporarily unavailable", 503);
  if (!current.active) return oauthError("invalid_grant", "Operator access has been revoked", 401);
}

async function candidateOperatorError(candidate: Awaited<ReturnType<typeof findAuthorizationCode>>) {
  if (hasOperatorCredentials(candidate)) return operatorError(candidate.operatorEmail, candidate.operatorRevision);
}

function matchesCodeGrant(grant: CodeGrant, clientId: string, redirectUri: string, verifier: string) {
  return grant.clientId === clientId && grant.redirectUri === redirectUri && verifyPkceS256(verifier, grant.codeChallenge);
}

function usableCodeGrant(grant: CodeGrant | null, clientId: string, redirectUri: string, verifier: string): grant is OperatorCodeGrant {
  if (!grant?.operatorEmail) return false;
  return matchesCodeGrant(grant, clientId, redirectUri, verifier);
}

function resourceError(form: FormData, resource: string) {
  const requested = field(form, "resource");
  if (requested && requested.replace(/\/+$/, "") !== resource.replace(/\/+$/, "")) {
    return oauthError("invalid_target", "resource does not match the authorization request");
  }
}

function codeCredentialError(grant: OperatorCodeGrant, form: FormData) {
  if (!grant.operatorRevision) return oauthError("invalid_grant", "Operator credentials changed", 401);
  return resourceError(form, grant.resource);
}

async function issueCodeTokens(db: Database, grant: OperatorCodeGrant, clientId: string) {
  const params = { clientId, resource: grant.resource, operatorEmail: grant.operatorEmail, operatorRevision: grant.operatorRevision! };
  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken(params),
    createRefreshToken(db, params),
  ]);
  return tokenResponse(accessToken, refreshToken);
}

async function exchangeAuthorizationCode(db: Database, form: FormData, clientId: string, code: string, verifier: string, redirectUri: string) {
  const candidateError = await candidateOperatorError(await findAuthorizationCode(db, code));
  if (candidateError) return candidateError;
  const grant = await consumeAuthorizationCode(db, code);
  if (!usableCodeGrant(grant, clientId, redirectUri, verifier)) {
    return oauthError("invalid_grant", "Authorization code is invalid, expired or already used");
  }
  const error = codeCredentialError(grant, form);
  if (error) return error;
  return issueCodeTokens(db, grant, clientId);
}

async function authorizationCodeGrant(db: Database, form: FormData, clientId: string) {
  const code = field(form, "code");
  const verifier = field(form, "code_verifier");
  const redirectUri = field(form, "redirect_uri");
  if (!code || !verifier || !redirectUri) return oauthError("invalid_request", "code, code_verifier and redirect_uri are required");
  return exchangeAuthorizationCode(db, form, clientId, code, verifier, redirectUri);
}

async function rotatedGrant(db: Database, refreshToken: string, clientId: string) {
  const rotated = await rotateRefreshToken(db, refreshToken, clientId);
  if (!rotated) return oauthError("invalid_grant", "Refresh token is invalid or expired");
  if (!hasOperatorCredentials(rotated)) return oauthError("invalid_grant", "Refresh token has no active operator", 401);
  const accessToken = await signAccessToken({ clientId, resource: rotated.resource, operatorEmail: rotated.operatorEmail, operatorRevision: rotated.operatorRevision });
  return tokenResponse(accessToken, rotated.refreshToken);
}

async function refreshGrant(db: Database, form: FormData, clientId: string) {
  const refreshToken = field(form, "refresh_token");
  if (!refreshToken) return oauthError("invalid_request", "refresh_token is required");
  const current = await findRefreshToken(db, refreshToken, clientId);
  if (!hasOperatorCredentials(current)) return oauthError("invalid_grant", "Refresh token is invalid or expired", 401);
  const error = await operatorError(current.operatorEmail, current.operatorRevision);
  if (error) return error;
  return rotatedGrant(db, refreshToken, clientId);
}

function dispatchGrant(db: Database, form: FormData, clientId: string) {
  const grantType = field(form, "grant_type");
  if (grantType === "authorization_code") return authorizationCodeGrant(db, form, clientId);
  if (grantType === "refresh_token") return refreshGrant(db, form, clientId);
  return oauthError("unsupported_grant_type", "Use authorization_code or refresh_token");
}

async function clientGrant(form: FormData) {
  const db = getDb();
  const clientId = field(form, "client_id");
  if (!clientId) return oauthError("invalid_request", "client_id is required");
  if (!(await findClient(db, clientId))) return oauthError("invalid_client", "Unknown client", 401);
  return dispatchGrant(db, form, clientId);
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
  return clientGrant(form);
}

export const OPTIONS = oauthPreflight;
