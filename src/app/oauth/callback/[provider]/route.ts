import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
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

function providerCredentials(provider: Provider) {
  const config = {
    google: { clientId: process.env.GOOGLE_OAUTH_CLIENT_ID, clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET },
    microsoft: { clientId: process.env.MICROSOFT_OAUTH_CLIENT_ID, clientSecret: process.env.MICROSOFT_OAUTH_CLIENT_SECRET },
  }[provider];
  if (!config.clientId || !config.clientSecret) throw new Error("Provider is not configured");
  return { clientId: config.clientId, clientSecret: config.clientSecret };
}

async function tokenEndpoint(provider: Provider) {
  if (provider === "google") return "https://oauth2.googleapis.com/token";
  const discovery = await fetch(microsoftDiscovery, { signal: AbortSignal.timeout(5_000) });
  if (!discovery.ok) throw new Error("Provider metadata unavailable");
  return (await discovery.json()).token_endpoint as string;
}

async function tokenResponse(provider: Provider, body: URLSearchParams) {
  const { clientId, clientSecret } = providerCredentials(provider);
  const endpoint = await tokenEndpoint(provider);
  body.set("client_id", clientId);
  body.set("client_secret", clientSecret);
  body.set("grant_type", "authorization_code");
  body.set("redirect_uri", `${getIssuer()}/oauth/callback/${provider}`);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error("Provider token exchange failed");
  return await response.json() as { id_token?: string; access_token?: string };
}

function validNonceAndSubject(payload: JWTPayload, state: LoginState): payload is JWTPayload & { sub: string } {
  return payload.nonce === state.nonce && typeof payload.sub === "string";
}

function verifiedGoogleClaims(payload: JWTPayload, state: LoginState): payload is JWTPayload & { email: string; sub: string } {
  if (!validNonceAndSubject(payload, state)) return false;
  return typeof payload.email === "string" && payload.email_verified === true;
}

function hostedDomain(payload: JWTPayload) {
  return typeof payload.hd === "string" ? payload.hd : undefined;
}

async function verifyGoogle(idToken: string, state: LoginState) {
  const { payload } = await jwtVerify(idToken, googleJwks, {
    algorithms: ["RS256"],
    audience: process.env.GOOGLE_OAUTH_CLIENT_ID,
    issuer: ["https://accounts.google.com", "accounts.google.com"],
  });
  if (!verifiedGoogleClaims(payload, state)) return null;
  const issuer = payload.iss === "accounts.google.com" ? "https://accounts.google.com" : payload.iss;
  if (issuer !== "https://accounts.google.com") return null;
  return authorizeGoogleOperator(payload.email, true, issuer, payload.sub, hostedDomain(payload));
}

async function microsoftKeys() {
  const discoveryResponse = await fetch(microsoftDiscovery, { signal: AbortSignal.timeout(5_000) });
  if (!discoveryResponse.ok) throw new Error("Provider metadata unavailable");
  const metadata = await discoveryResponse.json() as { jwks_uri: string };
  microsoftJwksPromise ??= Promise.resolve(createRemoteJWKSet(new URL(metadata.jwks_uri)));
  return microsoftJwksPromise;
}

function validMicrosoftClaims(payload: JWTPayload, state: LoginState): payload is JWTPayload & { iss: string; sub: string; tid: string } {
  if (!validNonceAndSubject(payload, state)) return false;
  return typeof payload.iss === "string" && typeof payload.tid === "string";
}

function microsoftIssuerMatches(issuer: string, tenant: string) {
  const match = /^https:\/\/login\.microsoftonline\.com\/([0-9a-f-]{36})\/v2\.0$/i.exec(issuer);
  return Boolean(match && match[1].toLowerCase() === tenant.toLowerCase());
}

async function verifyMicrosoft(idToken: string, state: LoginState) {
  const { payload } = await jwtVerify(idToken, await microsoftKeys(), {
    algorithms: ["RS256"],
    audience: process.env.MICROSOFT_OAUTH_CLIENT_ID,
  });
  if (!validMicrosoftClaims(payload, state)) return null;
  if (!microsoftIssuerMatches(payload.iss, payload.tid)) return null;
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

async function googleIdentity(idToken: string, state: LoginState) {
  const operator = await verifyGoogle(idToken, state);
  return operator
    ? { operator, response: undefined }
    : { operator: undefined, response: errorResponse(403) };
}

async function authenticatedOperator(provider: Provider, idToken: string, state: LoginState) {
  if (provider === "google") return googleIdentity(idToken, state);
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
  return authorizeOperator(identity.operator, authorization);
}

type Operator = NonNullable<Awaited<ReturnType<typeof authorizeGoogleOperator>>>;

async function authorizeOperator(operator: Operator, authorization: Record<string, string>) {
  const validation = await validateAuthorizeRequest(getDb(), authorization);
  if (!validation.ok) return errorResponse();
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

function validProvider(provider: string): provider is Provider {
  return provider === "google" || provider === "microsoft";
}

function matchesCallback(state: LoginState, provider: Provider, callbackState: string) {
  return state.provider === provider && state.state === callbackState;
}

function matchesLoginNonce(loginState: Awaited<ReturnType<typeof consumeLoginState>>, state: LoginState): loginState is NonNullable<Awaited<ReturnType<typeof consumeLoginState>>> {
  return Boolean(loginState && loginState.nonce === state.nonce);
}

async function consumeCallback(provider: Provider, stateCookie: string, callbackState: string, code: string) {
  try {
    const { payload } = await jwtVerify(stateCookie, getJwtSecret(), {
      algorithms: ["HS256"],
      issuer: getIssuer(),
      audience: `${getIssuer()}/oauth/callback/${provider}`,
    });
    const state = payload as typeof payload & LoginState;
    if (!matchesCallback(state, provider, callbackState)) return errorResponse();
    const loginState = await consumeLoginState(getDb(), callbackState, provider);
    if (!matchesLoginNonce(loginState, state)) return errorResponse();
    return await finishLogin(provider, state, code, loginState.authorization);
  } catch {
    return errorResponse();
  }
}

function callbackRequest(request: Request, provider: Provider) {
  const url = new URL(request.url);
  const stateCookie = cookieValue(request);
  const callbackState = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  if (!stateCookie || !callbackState || !code) return errorResponse();
  return consumeCallback(provider, stateCookie, callbackState, code);
}

export async function GET(request: Request, context: { params: Promise<{ provider: string }> }) {
  if (!isMcpConfigured()) return errorResponse(503);
  const { provider } = await context.params;
  if (!validProvider(provider)) return errorResponse(404);
  return callbackRequest(request, provider);
}
