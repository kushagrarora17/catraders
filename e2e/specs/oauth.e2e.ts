import { ADMIN_PASSWORD, SITE_URL } from "../env";
import {
  authorizationCode,
  authorizeParams,
  freshIp,
  getTokens,
  pkcePair,
  postRaw,
  REDIRECT_URI,
  registerClient,
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

  test("asks for the admin password and redirects back with a code", async ({ page, request }) => {
    const clientId = await registerClient(request, "Claude Desktop");
    const { challenge } = pkcePair();
    await page.setExtraHTTPHeaders({ "x-forwarded-for": freshIp() });
    await page.goto(`/oauth/authorize?${new URLSearchParams(authorizeParams(clientId, challenge))}`);
    await expect(page.getByText("Claude Desktop wants to manage the catalog")).toBeVisible();

    await page.getByLabel("Admin password").fill("wrong");
    await page.getByRole("button", { name: "Allow access" }).click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText("Incorrect password");

    // Nothing listens on the client's redirect URI; capturing the request is enough.
    const redirect = page.waitForRequest((req) => req.url().startsWith(REDIRECT_URI));
    await page.getByLabel("Admin password").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Allow access" }).click();
    const redirected = new URL((await redirect).url());
    expect(redirected.searchParams.get("code")).toBeTruthy();
    expect(redirected.searchParams.get("state")).toBe("xyz");
    expect(redirected.searchParams.get("iss")).toBe(SITE_URL);
  });

  test("bounces invalid submissions back to the page", async ({ request }) => {
    const res = await request.post("/oauth/authorize/submit", {
      headers: { "x-forwarded-for": freshIp() },
      form: { client_id: "nope", password: ADMIN_PASSWORD },
      maxRedirects: 0,
    });
    expect(res.status()).toBe(303);
    expect(res.headers().location).toBe(`${SITE_URL}/oauth/authorize?error=request`);
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
