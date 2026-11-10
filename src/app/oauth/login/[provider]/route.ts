import { SignJWT } from "jose";
import { getJwtSecret, getIssuer, isMcpConfigured } from "@/server/oauth/config";
import { getDb } from "@/server/db";
import { authorizeQuery, validateAuthorizeRequest } from "@/server/oauth/authorize";
import { createLoginState } from "@/server/oauth/repository";
import { allowAction, getClientIp } from "@/server/oauth/rate-limit";

const LOGIN_COOKIE = "mcp_oidc_login";
const LOGIN_TTL = 10 * 60;
const microsoftDiscovery = "https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration";
const microsoftMetadata = createMetadataCache(microsoftDiscovery);

function createMetadataCache(url: string) {
  let pending: Promise<{ issuer: string; authorization_endpoint: string; token_endpoint: string; jwks_uri: string }> | undefined;
  return async () => {
    pending ??= fetch(url, { signal: AbortSignal.timeout(5_000) }).then(async (response) => {
      if (!response.ok) throw new Error("Identity provider metadata unavailable");
      return response.json();
    });
    try { return await pending; } catch (error) { pending = undefined; throw error; }
  };
}

type Provider = "google" | "microsoft";
type ProviderConfig = { clientId?: string; clientSecret?: string; redirectUri: string; authorizationEndpoint?: string; tokenEndpoint?: string };

function providerConfig(provider: Provider): ProviderConfig {
  if (provider === "google") return {
    clientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
    clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    redirectUri: `${getIssuer()}/oauth/callback/google`,
    authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenEndpoint: "https://oauth2.googleapis.com/token",
  };
  return {
    clientId: process.env.MICROSOFT_OAUTH_CLIENT_ID,
    clientSecret: process.env.MICROSOFT_OAUTH_CLIENT_SECRET,
    redirectUri: `${getIssuer()}/oauth/callback/microsoft`,
  };
}

function setCookie(value: string) {
  const secure = new URL(getIssuer()).protocol === "https:" ? "; Secure" : "";
  return `${LOGIN_COOKIE}=${value}; Path=/oauth/callback; Max-Age=${LOGIN_TTL}; HttpOnly${secure}; SameSite=Lax`;
}

export async function POST(request: Request, context: { params: Promise<{ provider: string }> }) {
  if (!isMcpConfigured()) return Response.json({ error: "MCP access is not configured" }, { status: 503 });
  if (request.headers.get("origin") !== new URL(getIssuer()).origin) return Response.json({ error: "Sign-in must start from the authorization page" }, { status: 403 });
  const { provider: rawProvider } = await context.params;
  if (rawProvider !== "google" && rawProvider !== "microsoft") return new Response("Not found", { status: 404 });
  const provider = rawProvider as Provider;
  const config = providerConfig(provider);
  if (!config.clientId || !config.clientSecret) return Response.json({ error: "Sign-in provider is not configured" }, { status: 503 });

  let form: FormData;
  try { form = await request.formData(); } catch { return Response.json({ error: "Invalid authorization request" }, { status: 400 }); }
  const params = Object.fromEntries([...form.entries()].filter((entry): entry is [string, string] => typeof entry[1] === "string"));
  const validation = await validateAuthorizeRequest(getDb(), params);
  if (!validation.ok) return Response.json({ error: validation.message }, { status: 400 });
  if (!allowAction(`oidc-login:${provider}:${getClientIp(request)}`, 10, 15 * 60 * 1000)) {
    return Response.json({ error: "Too many sign-in attempts. Try again later." }, { status: 429 });
  }

  let authorizationEndpoint = config.authorizationEndpoint;
  if (provider === "microsoft") authorizationEndpoint = (await microsoftMetadata()).authorization_endpoint;

  const state = crypto.randomUUID();
  const nonce = crypto.randomUUID();
  const authorizationParams = Object.fromEntries(authorizeQuery(validation.params).entries());
  const authorization = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: provider === "google" ? "openid email profile" : "openid profile email",
    state,
    nonce,
  });
  if (provider === "google") {
    authorization.set("access_type", "online");
    authorization.set("prompt", "select_account");
  }
  const authorizationUrl = new URL(authorizationEndpoint!);
  authorizationUrl.search = authorization.toString();
  const signedState = await new SignJWT({ provider, state, nonce })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(getIssuer())
    .setAudience(`${getIssuer()}/oauth/callback/${provider}`)
    .setIssuedAt()
    .setExpirationTime(`${LOGIN_TTL}s`)
    .sign(getJwtSecret());
  await createLoginState(getDb(), { state, nonce, provider, authorization: authorizationParams });
  return new Response(null, { status: 303, headers: { Location: authorizationUrl.href, "Set-Cookie": setCookie(signedState), "Cache-Control": "no-store" } });
}

