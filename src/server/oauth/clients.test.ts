import { describe, expect, test } from "bun:test";
import { isAllowedRedirectUri, redirectUriMatches, registrationSchema } from "./clients";

describe("isAllowedRedirectUri", () => {
  test("allows https and loopback http", () => {
    expect(isAllowedRedirectUri("https://claude.ai/api/mcp/auth_callback")).toBe(true);
    expect(isAllowedRedirectUri("http://localhost:33418/callback")).toBe(true);
    expect(isAllowedRedirectUri("http://127.0.0.1:8080/cb")).toBe(true);
  });

  test("rejects plain http elsewhere, custom schemes, fragments, credentials and junk", () => {
    for (const uri of [
      "http://evil.test/cb",
      "javascript:alert(1)",
      "myapp://callback",
      "https://claude.ai/cb#frag",
      "https://user:pw@claude.ai/cb",
      "not a url",
    ]) {
      expect(isAllowedRedirectUri(uri)).toBe(false);
    }
  });
});

describe("redirectUriMatches", () => {
  test("requires an exact match for https URIs", () => {
    const registered = ["https://claude.ai/api/mcp/auth_callback"];
    expect(redirectUriMatches(registered, "https://claude.ai/api/mcp/auth_callback")).toBe(true);
    expect(redirectUriMatches(registered, "https://claude.ai/api/mcp/auth_callback/")).toBe(false);
    expect(redirectUriMatches(registered, "https://evil.test/api/mcp/auth_callback")).toBe(false);
  });

  test("lets loopback redirects vary the port only", () => {
    const registered = ["http://localhost:1111/callback"];
    expect(redirectUriMatches(registered, "http://localhost:2222/callback")).toBe(true);
    expect(redirectUriMatches(registered, "http://localhost:2222/other")).toBe(false);
    expect(redirectUriMatches(registered, "http://127.0.0.1:2222/callback")).toBe(false);
  });
});

describe("registrationSchema", () => {
  test("accepts a minimal public-client registration", () => {
    const parsed = registrationSchema.safeParse({
      redirect_uris: ["https://claude.ai/api/mcp/auth_callback"],
      client_name: "Claude",
      token_endpoint_auth_method: "none",
    });
    expect(parsed.success).toBe(true);
  });

  test("rejects missing, disallowed or confidential-client registrations", () => {
    expect(registrationSchema.safeParse({}).success).toBe(false);
    expect(registrationSchema.safeParse({ redirect_uris: [] }).success).toBe(false);
    expect(registrationSchema.safeParse({ redirect_uris: ["http://evil.test/cb"] }).success).toBe(false);
    expect(
      registrationSchema.safeParse({
        redirect_uris: ["https://claude.ai/cb"],
        token_endpoint_auth_method: "client_secret_basic",
      }).success,
    ).toBe(false);
  });
});
