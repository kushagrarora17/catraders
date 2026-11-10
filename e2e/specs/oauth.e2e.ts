import { SITE_URL } from "../env";
import {
  authorizationCode,
  authorizeParams,
  freshIp,
  getTokens,
  pkcePair,
  postRaw,
  REDIRECT_URI,
  registerClient,
  setOperatorEnabled,
  setOperatorLookupFailure,
} from "../helpers";
import { expect, test } from "../test";

test.describe("discovery", () => {
  test("serves authorization-server and protected-resource metadata", async ({ request }) => {
    const server = await (await request.get("/.well-known/oauth-authorization-server")).json();
    expect(server).toMatchObject({
      issuer: SITE_URL,
      token_endpoint: `${SITE_URL}/oauth/token`,
      code_challenge_methods_supported: ["S256"],
    });

    for (const path of ["/.well-known/oauth-protected-resource", "/.well-known/oauth-protected-resource/api/mcp"]) {
      expect(await (await request.get(path)).json()).toMatchObject({ resource: `${SITE_URL}/api/mcp`, scopes_supported: ["mcp"] });
    }
    expect((await request.get("/.well-known/oauth-protected-resource/other")).status()).toBe(404);
  });
});

test.describe("POST /oauth/register", () => {
  test("registers public clients and validates metadata", async ({ request }) => {
    const ip = freshIp();
    const post = (body: string) => postRaw(request, "/oauth/register", body, { "x-forwarded-for": ip });

    const ok = await post(JSON.stringify({ client_name: "Claude", redirect_uris: [REDIRECT_URI] }));
    expect(ok.status()).toBe(201);
    expect(await ok.json()).toMatchObject({ client_name: "Claude", token_endpoint_auth_method: "none" });
    expect(ok.headers()["access-control-allow-origin"]).toBe("*");

    expect(await (await post("{")).json()).toMatchObject({ error: "invalid_client_metadata" });
    expect((await post(JSON.stringify({ redirect_uris: ["ftp://x"] }))).status()).toBe(400);
    expect((await post("x".repeat(9000))).status()).toBe(413);

    const preflight = await request.fetch("/oauth/register", { method: "OPTIONS" });
    expect(preflight.status()).toBe(204);
  });

  test("rate-limits registrations per client IP", async ({ request }) => {
    const headers = { "x-forwarded-for": `${freshIp()}:51234` };
    const statuses: number[] = [];
    for (let i = 0; i < 11; i++) {
      statuses.push((await request.post("/oauth/register", { headers, data: { redirect_uris: [REDIRECT_URI] } })).status());
    }
    expect(statuses.slice(0, 10).every((s) => s === 201)).toBe(true);
    expect(statuses[10]).toBe(429);
  });
});

test.describe("authorization page", () => {
  test("explains invalid requests", async ({ page, request }) => {
    const clientId = await registerClient(request);
    const { challenge } = pkcePair();
    const open = async (params: Record<string, string>) => {
      await page.goto(`/oauth/authorize?${new URLSearchParams(params)}`);
      return page.getByRole("main").getByRole("alert");
    };

    await expect(await open({ response_type: "token" })).toContainText("invalid or incomplete");
    await expect(await open(authorizeParams("unknown-client", challenge))).toContainText("Unknown client");
    await expect(await open(authorizeParams(clientId, challenge, { redirect_uri: "http://evil.example/cb" }))).toContainText(
      "redirect address does not match",
    );
    await expect(await open(authorizeParams(clientId, challenge, { resource: "https://other.example/mcp" }))).toContainText(
      "different resource",
    );
    await expect(await open(authorizeParams(clientId, challenge, { scope: "admin" }))).toContainText("unsupported permissions");
  });

  test("requires explicit same-origin provider sign-in after displaying client consent", async ({ page, request }) => {
    const clientId = await registerClient(request, "Claude Desktop");
    const { challenge } = pkcePair();
    await page.setExtraHTTPHeaders({ "x-forwarded-for": freshIp() });
    await page.goto(`/oauth/authorize?${new URLSearchParams(authorizeParams(clientId, challenge))}`);
    await expect(page.getByText("Claude Desktop wants to manage the catalog")).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue with Microsoft" })).toBeVisible();

    const form = authorizeParams(clientId, challenge);
    const forbidden = await request.post("/oauth/login/google", { form, maxRedirects: 0 });
    expect(forbidden.status()).toBe(403);
    const directGet = await request.get(`/oauth/login/google?${new URLSearchParams(form)}`, { maxRedirects: 0 });
    expect(directGet.status()).toBe(405);

    const consent = await request.post("/oauth/login/google", {
      headers: { origin: SITE_URL },
      form,
      maxRedirects: 0,
    });
    expect(consent.status()).toBe(303);
    const providerUrl = new URL(consent.headers().location);
    expect(providerUrl.origin).toBe("https://accounts.google.com");
    expect(providerUrl.searchParams.get("client_id")).toBe("e2e-google-client-id");
    expect(consent.headers()["set-cookie"]).toContain("mcp_oidc_login=");
  });

  test("retires the shared-password authorization endpoint", async ({ request }) => {
    const res = await request.post("/oauth/authorize/submit", {
      form: { client_id: "nope", password: "ignored" },
      maxRedirects: 0,
    });
    expect(res.status()).toBe(410);
  });
});

test.describe("POST /oauth/token", () => {
  test("exchanges a code, then rotates the refresh token", async ({ request }) => {
    const { clientId, accessToken, refreshToken } = await getTokens(request);
    expect(accessToken).toMatch(/^ey/);

    const refreshed = await request.post("/oauth/token", {
      form: { grant_type: "refresh_token", client_id: clientId, refresh_token: refreshToken },
    });
    const body = await refreshed.json();
    expect(body).toMatchObject({ token_type: "Bearer", scope: "mcp" });
    expect(body.refresh_token).not.toBe(refreshToken);

    // The old refresh token is spent.
    const reused = await request.post("/oauth/token", {
      form: { grant_type: "refresh_token", client_id: clientId, refresh_token: refreshToken },
    });
    expect(await reused.json()).toMatchObject({ error: "invalid_grant" });
  });

  test("keeps a valid refresh token after a temporary allowlist outage", async ({ request }) => {
    const { clientId, refreshToken } = await getTokens(request);
    await setOperatorLookupFailure(request, true);
    try {
      const unavailable = await request.post("/oauth/token", {
        form: { grant_type: "refresh_token", client_id: clientId, refresh_token: refreshToken },
      });
      expect(unavailable.status()).toBe(503);
    } finally {
      await setOperatorLookupFailure(request, false);
    }
    const retried = await request.post("/oauth/token", {
      form: { grant_type: "refresh_token", client_id: clientId, refresh_token: refreshToken },
    });
    expect(retried.status()).toBe(200);
  });

  test("disabling and re-enabling an operator does not revive existing grants", async ({ request }) => {
    const { clientId, accessToken, refreshToken } = await getTokens(request);
    await setOperatorEnabled(request, false);
    const denied = await request.post("/api/mcp", {
      headers: { authorization: `Bearer ${accessToken}`, accept: "application/json, text/event-stream" },
      data: { jsonrpc: "2.0", id: 1, method: "tools/list" },
    });
    expect(denied.status()).toBe(401);
    await setOperatorEnabled(request, true);

    const stillDenied = await request.post("/api/mcp", {
      headers: { authorization: `Bearer ${accessToken}`, accept: "application/json, text/event-stream" },
      data: { jsonrpc: "2.0", id: 2, method: "tools/list" },
    });
    expect(stillDenied.status()).toBe(401);
    const refreshDenied = await request.post("/oauth/token", {
      form: { grant_type: "refresh_token", client_id: clientId, refresh_token: refreshToken },
    });
    expect(refreshDenied.status()).toBe(401);
  });

  test("rejects invalid token requests", async ({ request }) => {
    const clientId = await registerClient(request);
    const token = async (form: Record<string, string>) => (await request.post("/oauth/token", { form })).json();

    expect(await (await postRaw(request, "/oauth/token", "{}")).json()).toMatchObject({ error: "invalid_request" });
    expect(await token({ grant_type: "authorization_code" })).toMatchObject({ error: "invalid_request" });
    expect(await token({ client_id: "nope" })).toMatchObject({ error: "invalid_client" });
    expect(await token({ client_id: clientId, grant_type: "password" })).toMatchObject({ error: "unsupported_grant_type" });
    expect(await token({ client_id: clientId, grant_type: "authorization_code", code: "x" })).toMatchObject({
      error: "invalid_request",
    });
    expect(await token({ client_id: clientId, grant_type: "refresh_token" })).toMatchObject({ error: "invalid_request" });

    const { verifier, challenge } = pkcePair();
    const exchange = (code: string, extra: Record<string, string> = {}) =>
      token({ grant_type: "authorization_code", client_id: clientId, code, code_verifier: verifier, redirect_uri: REDIRECT_URI, ...extra });

    expect(await exchange("bogus")).toMatchObject({ error: "invalid_grant" });
    const code = await authorizationCode(request, clientId, challenge);
    expect(await exchange(code, { resource: "https://other.example/mcp" })).toMatchObject({ error: "invalid_target" });
    // A code works once, even after a failed exchange.
    expect(await exchange(code)).toMatchObject({ error: "invalid_grant" });

    const preflight = await request.fetch("/oauth/token", { method: "OPTIONS" });
    expect(preflight.status()).toBe(204);
  });
});
