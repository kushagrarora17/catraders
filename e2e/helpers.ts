import { createHash, randomBytes } from "node:crypto";
import type { APIRequestContext } from "@playwright/test";
import { encodeSignatureHeader, SIGNATURE_HEADER_NAME } from "@sanity/webhook";
import { ADMIN_PASSWORD, MOCK_URL, SITE_URL, WEBHOOK_SECRET } from "./env";

// Never contacted: the browser test intercepts the redirect. (Chrome refuses "unsafe" ports like 9.)
export const REDIRECT_URI = "http://127.0.0.1:47123/callback";

const octet = () => Math.floor(Math.random() * 254) + 1;
/** A random client IP, so the per-IP rate limits of the OAuth endpoints don't carry across tests. */
export const freshIp = () => `10.${octet()}.${octet()}.${octet()}`;

/** Posts a body exactly as given (Playwright would JSON-encode a string passed as `data`). */
export function postRaw(request: APIRequestContext, url: string, body: string, headers: Record<string, string> = {}) {
  return request.post(url, { headers: { "content-type": "application/json", ...headers }, data: Buffer.from(body) });
}

/** Sends a correctly signed Sanity webhook. */
export async function sendWebhook(request: APIRequestContext, body: string) {
  const signature = await encodeSignatureHeader(body, Date.now(), WEBHOOK_SECRET);
  return postRaw(request, "/api/webhooks/sanity", body, { [SIGNATURE_HEADER_NAME]: signature });
}

/** Restores the seed content and expires the app's cached copies of it. */
export async function resetContent(request: APIRequestContext) {
  await request.post(`${MOCK_URL}/__reset`);
  for (const _type of ["product", "testimonial", "serviceArea"]) await sendWebhook(request, JSON.stringify({ _type }));
}

/** Reads one document straight from the mock Sanity dataset (drafts included). */
export async function mockDoc(request: APIRequestContext, id: string) {
  return (await request.get(`${MOCK_URL}/__docs/${encodeURIComponent(id)}`)).json();
}

export function pkcePair() {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export async function registerClient(request: APIRequestContext, name = "E2E client") {
  const res = await request.post("/oauth/register", {
    headers: { "x-forwarded-for": freshIp() },
    data: { client_name: name, redirect_uris: [REDIRECT_URI] },
  });
  return ((await res.json()) as { client_id: string }).client_id;
}

export function authorizeParams(clientId: string, challenge: string, extra: Record<string, string> = {}) {
  return {
    response_type: "code",
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    code_challenge: challenge,
    code_challenge_method: "S256",
    state: "xyz",
    resource: `${SITE_URL}/api/mcp`,
    scope: "mcp",
    ...extra,
  };
}

/** Runs the authorization-code flow over HTTP and returns the code. */
export async function authorizationCode(request: APIRequestContext, clientId: string, challenge: string) {
  const res = await request.post("/oauth/authorize/submit", {
    headers: { "x-forwarded-for": freshIp() },
    form: { ...authorizeParams(clientId, challenge), password: ADMIN_PASSWORD },
    maxRedirects: 0,
  });
  return new URL(res.headers().location).searchParams.get("code")!;
}

export async function getTokens(request: APIRequestContext) {
  const clientId = await registerClient(request);
  const { verifier, challenge } = pkcePair();
  const code = await authorizationCode(request, clientId, challenge);
  const res = await request.post("/oauth/token", {
    form: { grant_type: "authorization_code", client_id: clientId, code, code_verifier: verifier, redirect_uri: REDIRECT_URI },
  });
  const body = (await res.json()) as { access_token: string; refresh_token: string };
  return { clientId, accessToken: body.access_token, refreshToken: body.refresh_token };
}

let rpcId = 0;

/** A JSON-RPC call to /api/mcp; returns the parsed message from the SSE response. */
export async function mcpRpc(request: APIRequestContext, token: string, method: string, params: unknown = {}) {
  const res = await request.post("/api/mcp", {
    headers: { authorization: `Bearer ${token}`, accept: "application/json, text/event-stream" },
    data: { jsonrpc: "2.0", id: ++rpcId, method, params },
  });
  const text = await res.text();
  const data = text
    .split("\n")
    .filter((line) => line.startsWith("data: "))
    .map((line) => line.slice(6))
    .join("");
  return JSON.parse(data || text) as { result?: Record<string, unknown>; error?: { message: string } };
}

export interface ToolResult {
  isError: boolean;
  text: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  json: any;
}

/** Calls an MCP tool and decodes its text content (JSON for successful calls). */
export async function callTool(
  request: APIRequestContext,
  token: string,
  name: string,
  args: Record<string, unknown> = {},
): Promise<ToolResult> {
  const message = await mcpRpc(request, token, "tools/call", { name, arguments: args });
  if (message.error) return { isError: true, text: message.error.message, json: undefined };
  const result = message.result as { isError?: boolean; content: { text: string }[] };
  const text = result.content[0]?.text ?? "";
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    json = undefined;
  }
  return { isError: !!result.isError, text, json };
}
