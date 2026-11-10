import { createRemoteJWKSet, jwtVerify } from "jose";
import { getJwtSecret, getIssuer, isMcpConfigured } from "@/server/oauth/config";
import { authorizeGoogleOperator, authorizeMicrosoftOperator } from "@/server/oauth/operators";
import { createAuthorizationCode } from "@/server/oauth/repository";
import { getDb } from "@/server/db";
import { validateAuthorizeRequest } from "@/server/oauth/authorize";
import { consumeLoginState } from "@/server/oauth/repository";

const COOKIE = "mcp_oidc_login";
const googleJwks = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
const microsoftDiscovery = "https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration";
let microsoftJwksPromise: Promise<ReturnType<typeof createRemoteJWKSet>> | undefined;

type LoginState = { provider: string; state: string; nonce: string };
type Provider = "google" | "microsoft";

function cookieValue(request: Request) {
  return request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
}

function clearCookie() {
  const secure = new URL(getIssuer()).protocol === "https:" ? "; Secure" : "";
  return `${COOKIE}=; Path=/oauth/callback; Max-Age=0; HttpOnly${secure}; SameSite=Lax`;
}

function errorResponse(status = 400) {
  return Response.json({ error: "Sign-in could not be verified. Start again from your MCP client." }, {
    status,
    headers: { "Set-Cookie": clearCookie(), "Cache-Control": "no-store" },
  });
}

async function tokenResponse(provider: Provider, body: URLSearchParams) {
  const clientId = provider === "google" ? process.env.GOOGLE_OAUTH_CLIENT_ID : process.env.MICROSOFT_OAUTH_CLIENT_ID;
  const clientSecret = provider === "google" ? process.env.GOOGLE_OAUTH_CLIENT_SECRET : process.env.MICROSOFT_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Provider is not configured");
  let tokenEndpoint = "https://oauth2.googleapis.com/token";
  if (provider === "microsoft") {
    const discovery = await fetch(microsoftDiscovery, { signal: AbortSignal.timeout(5_000) });
    if (!discovery.ok) throw new Error("Provider metadata unavailable");
    tokenEndpoint = (await discovery.json()).token_endpoint;
  }
  body.set("client_id", clientId);
  body.set("client_secret", clientSecret);
  body.set("grant_type", "authorization_code");
  body.set("redirect_uri", `${getIssuer()}/oauth/callback/${provider}`);
  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error("Provider token exchange failed");
  return await response.json() as { id_token?: string; access_token?: string };
}

async function verifyGoogle(idToken: string, state: LoginState) {
  const { payload } = await jwtVerify(idToken, googleJwks, {
    algorithms: ["RS256"],
    audience: process.env.GOOGLE_OAUTH_CLIENT_ID,
    issuer: ["https://accounts.google.com", "accounts.google.com"],
  });
  if (payload.nonce !== state.nonce || typeof payload.email !== "string" || payload.email_verified !== true || typeof payload.sub !== "string") return null;
  const issuer = payload.iss === "accounts.google.com" ? "https://accounts.google.com" : payload.iss;
  if (issuer !== "https://accounts.google.com") return null;
  return authorizeGoogleOperator(payload.email, true, issuer, payload.sub, typeof payload.hd === "string" ? payload.hd : undefined);
}

async function verifyMicrosoft(idToken: string, state: LoginState) {
  const discoveryResponse = await fetch(microsoftDiscovery, { signal: AbortSignal.timeout(5_000) });
  if (!discoveryResponse.ok) throw new Error("Provider metadata unavailable");
  const metadata = await discoveryResponse.json() as { jwks_uri: string };
  microsoftJwksPromise ??= Promise.resolve(createRemoteJWKSet(new URL(metadata.jwks_uri)));
  const { payload } = await jwtVerify(idToken, await microsoftJwksPromise, {
    algorithms: ["RS256"],
    audience: process.env.MICROSOFT_OAUTH_CLIENT_ID,
  });
  if (payload.nonce !== state.nonce || typeof payload.iss !== "string" || typeof payload.sub !== "string" || typeof payload.tid !== "string") return null;
  const match = /^https:\/\/login\.microsoftonline\.com\/([0-9a-f-]{36})\/v2\.0$/i.exec(payload.iss);
  if (!match || match[1].toLowerCase() !== payload.tid.toLowerCase()) return null;
  // Microsoft email and preferred_username claims do not prove mailbox ownership. An owner
  // manually verifies this email and binds this exact issuer+subject in the private Sanity list.
  return {
    issuer: payload.iss,
    subject: payload.sub,
    operator: await authorizeMicrosoftOperator(payload.iss, payload.sub),
  };
}

function microsoftEnrollmentResponse(issuer: string, subject: string) {
  return Response.json({
    error: "This Microsoft identity is not enrolled. Verify the operator's email out of band, then add the issuer and subject to the private operator allowlist.",
    enrollment: { provider: "microsoft", issuer, subject },
  }, { status: 403, headers: { "Set-Cookie": clearCookie(), "Cache-Control": "no-store" } });
}

async function authenticatedOperator(provider: Provider, idToken: string, state: LoginState) {
  if (provider === "google") {
    const operator = await verifyGoogle(idToken, state);
    return operator
      ? { operator, response: undefined }
      : { operator: undefined, response: errorResponse(403) };
  }
  const identity = await verifyMicrosoft(idToken, state);
  if (!identity) return { operator: undefined, response: errorResponse() };
  if (!identity.operator) return { operator: undefined, response: microsoftEnrollmentResponse(identity.issuer, identity.subject) };
  return { operator: identity.operator, response: undefined };
}

async function finishLogin(provider: Provider, state: LoginState, code: string, authorization: Record<string, string>) {
  const providerTokens = await tokenResponse(provider, new URLSearchParams({ code }));
  if (!providerTokens.id_token) return errorResponse();
  const identity = await authenticatedOperator(provider, providerTokens.id_token, state);
  if (identity.response) return identity.response;
  if (!identity.operator) return errorResponse(403);
  const validation = await validateAuthorizeRequest(getDb(), authorization);
  if (!validation.ok) return errorResponse();
  const operator = identity.operator;
  const authorizationCode = await createAuthorizationCode(getDb(), {
    clientId: validation.params.client_id,
    redirectUri: validation.params.redirect_uri,
    codeChallenge: validation.params.code_challenge,
    resource: validation.resource,
    operatorEmail: operator.email,
    operatorRevision: operator._rev,
  });
  const redirect = new URL(validation.params.redirect_uri);
  redirect.searchParams.set("code", authorizationCode);
  if (validation.params.state) redirect.searchParams.set("state", validation.params.state);
  redirect.searchParams.set("iss", getIssuer());
  return new Response(null, { status: 303, headers: { Location: redirect.href, "Set-Cookie": clearCookie(), "Cache-Control": "no-store" } });
}

export async function GET(request: Request, context: { params: Promise<{ provider: string }> }) {
  if (!isMcpConfigured()) return errorResponse(503);
  const { provider: rawProvider } = await context.params;
  if (rawProvider !== "google" && rawProvider !== "microsoft") return errorResponse(404);
  const provider = rawProvider as Provider;
  const url = new URL(request.url);
  const stateCookie = cookieValue(request);
  if (!stateCookie || !url.searchParams.get("state") || !url.searchParams.get("code")) return errorResponse();

  try {
    const { payload } = await jwtVerify(stateCookie, getJwtSecret(), {
      algorithms: ["HS256"],
      issuer: getIssuer(),
      audience: `${getIssuer()}/oauth/callback/${provider}`,
    });
    const state = payload as typeof payload & LoginState;
    const callbackState = url.searchParams.get("state");
    if (state.provider !== provider || state.state !== callbackState) return errorResponse();
    const loginState = await consumeLoginState(getDb(), callbackState, provider);
    if (!loginState || loginState.nonce !== state.nonce) return errorResponse();

    return await finishLogin(provider, state, url.searchParams.get("code")!, loginState.authorization);
  } catch {
    return errorResponse();
  }
}
