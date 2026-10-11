import "server-only";

const HEADERS = {
  "Cache-Control": "no-store",
  Pragma: "no-cache",
  // Public PKCE clients, no cookies: browser-based MCP tooling (e.g. the Inspector) can call these.
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export function oauthJson(body: unknown, status = 200) {
  return Response.json(body, { status, headers: HEADERS });
}

export function oauthError(error: string, description: string, status = 400) {
  return oauthJson({ error, error_description: description }, status);
}

export function oauthPreflight() {
  return new Response(null, { status: 204, headers: HEADERS });
}
