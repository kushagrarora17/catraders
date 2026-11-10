import { beforeAll, describe, expect, test } from "bun:test";
import { OAuthError, verifyBearerToken } from "@modelcontextprotocol/server";
import { SignJWT } from "jose";
import { getIssuer, getResourceUrl } from "./config";
import { createAccessTokenVerifier, randomToken, safeEqual, sha256Hex, signAccessToken } from "./tokens";

const SECRET = "test-secret-test-secret-test-secret-1234";

beforeAll(() => {
  process.env.MCP_JWT_SECRET = SECRET;
  process.env.SITE_URL = "https://example.test";
});

describe("access tokens", () => {
  test("round-trips client, scope, expiry and audience", async () => {
    const verifier = createAccessTokenVerifier(async (_email, revision) => revision === "rev-1");
    const token = await signAccessToken({ clientId: "client-1", resource: getResourceUrl().href, operatorEmail: "owner@example.com", operatorRevision: "rev-1" });
    const info = await verifier.verifyAccessToken(token);
    expect(info.clientId).toBe("client-1");
    expect(info.scopes).toEqual(["mcp"]);
    expect(info.resource?.href).toBe("https://example.test/api/mcp");
    expect(info.expiresAt).toBeGreaterThan(Date.now() / 1000);
    expect(info.extra).toEqual({ operatorEmail: "owner@example.com" });
  });

  test("rejects a token when the operator is no longer allowlisted", async () => {
    const token = await signAccessToken({ clientId: "c", resource: getResourceUrl().href, operatorEmail: "owner@example.com", operatorRevision: "rev-1" });
    await expect(createAccessTokenVerifier(async () => false).verifyAccessToken(token)).rejects.toBeInstanceOf(OAuthError);
    await expect(createAccessTokenVerifier(async (_email, revision) => revision === "rev-2").verifyAccessToken(token)).rejects.toBeInstanceOf(OAuthError);
  });

  test("the bearer guard accepts our audience and rejects a token minted for another resource", async () => {
    const verifier = createAccessTokenVerifier(async () => true);
    const guard = { verifier, expectedResource: getResourceUrl() };
    const ours = await signAccessToken({ clientId: "c", resource: getResourceUrl().href, operatorEmail: "owner@example.com", operatorRevision: "rev-1" });
    const theirs = await signAccessToken({ clientId: "c", resource: "https://other.test/api/mcp", operatorEmail: "owner@example.com", operatorRevision: "rev-1" });

    expect((await verifyBearerToken(`Bearer ${ours}`, guard)).clientId).toBe("c");
    await expect(verifyBearerToken(`Bearer ${theirs}`, guard)).rejects.toBeInstanceOf(OAuthError);
    await expect(verifyBearerToken(undefined, guard)).rejects.toBeInstanceOf(OAuthError);
  });

  test("rejects tampered, expired, wrong-issuer and wrong-key tokens", async () => {
    const good = await signAccessToken({ clientId: "c", resource: getResourceUrl().href, operatorEmail: "owner@example.com", operatorRevision: "rev-1" });
    const key = new TextEncoder().encode(SECRET);
    const verifier = createAccessTokenVerifier(async () => true);
    const forge = (claims: { iss?: string; exp: number }, secret = key) =>
      new SignJWT({ client_id: "c", scope: "mcp", operator_email: "owner@example.com", operator_revision: "rev-1" })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuer(claims.iss ?? getIssuer())
        .setAudience(getResourceUrl().href)
        .setSubject("owner@example.com")
        .setExpirationTime(claims.exp)
        .sign(secret);

    const now = Math.floor(Date.now() / 1000);
    const bad = [
      `${good.slice(0, -2)}xx`,
      await forge({ exp: now - 60 }),
      await forge({ exp: now + 60, iss: "https://evil.test" }),
      await forge({ exp: now + 60 }, new TextEncoder().encode("another-secret-another-secret-1234567")),
      "not-a-jwt",
    ];
    for (const token of bad) {
      await expect(verifier.verifyAccessToken(token)).rejects.toBeInstanceOf(OAuthError);
    }
  });
});

describe("token helpers", () => {
  test("randomToken is URL-safe and unique", () => {
    const a = randomToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(randomToken()).not.toBe(a);
  });

  test("sha256Hex is a stable 64-char digest", () => {
    expect(sha256Hex("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });

  test("safeEqual compares by value regardless of length", () => {
    expect(safeEqual("secret", "secret")).toBe(true);
    expect(safeEqual("secret", "secreT")).toBe(false);
    expect(safeEqual("secret", "a-much-longer-value")).toBe(false);
  });
});
