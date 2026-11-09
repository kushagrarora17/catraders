import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { getTurnstileSiteKey, verifyTurnstile } from "./turnstile";

describe("Turnstile verification", () => {
  const original = {
    NODE_ENV: process.env.NODE_ENV,
    TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY,
    TURNSTILE_SITE_KEY: process.env.TURNSTILE_SITE_KEY,
    SITE_URL: process.env.SITE_URL,
  };
  let fetchSpy: ReturnType<typeof spyOn<typeof globalThis, "fetch">>;

  beforeEach(() => {
    Object.assign(process.env, {
      NODE_ENV: "production",
      TURNSTILE_SECRET_KEY: "test-secret",
      TURNSTILE_SITE_KEY: "test-site-key",
      SITE_URL: "https://caelitelube.com",
    });
    fetchSpy = spyOn(globalThis, "fetch");
    fetchSpy.mockResolvedValue(Response.json({ success: true, hostname: "caelitelube.com", action: "inquiry" }));
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  test("rejects missing configuration in production", async () => {
    delete process.env.TURNSTILE_SECRET_KEY;
    expect(await verifyTurnstile("token", "inquiry")).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test("leaves unconfigured local development usable", async () => {
    Object.assign(process.env, { NODE_ENV: "development" });
    delete process.env.TURNSTILE_SECRET_KEY;
    expect(getTurnstileSiteKey()).toBeUndefined();
    expect(await verifyTurnstile(undefined, "inquiry")).toBe(true);
  });

  test("rejects missing, malformed and oversized tokens before calling Cloudflare", async () => {
    for (const token of [undefined, null, {}, "", "x".repeat(2049)]) {
      expect(await verifyTurnstile(token, "inquiry")).toBe(false);
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test("requires a successful verification for the correct hostname and form", async () => {
    expect(await verifyTurnstile("token", "inquiry")).toBe(true);
    const [url, options] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://challenges.cloudflare.com/turnstile/v0/siteverify");
    expect(JSON.parse(options?.body as string)).toEqual({ secret: "test-secret", response: "token" });
    for (const result of [
      { success: false, hostname: "caelitelube.com", action: "inquiry" },
      { success: true, hostname: "other.example", action: "inquiry" },
      { success: true, hostname: "caelitelube.com", action: "quote" },
    ]) {
      fetchSpy.mockResolvedValueOnce(Response.json(result));
      expect(await verifyTurnstile("token", "inquiry")).toBe(false);
    }
  });

  test("rejects verification outages and malformed responses", async () => {
    fetchSpy.mockRejectedValueOnce(new Error("timeout"));
    expect(await verifyTurnstile("token", "quote")).toBe(false);
    fetchSpy.mockResolvedValueOnce(new Response("unavailable", { status: 503 }));
    expect(await verifyTurnstile("token", "quote")).toBe(false);
    fetchSpy.mockResolvedValueOnce(new Response("not JSON"));
    expect(await verifyTurnstile("token", "quote")).toBe(false);
  });

  test("both forms recover with fresh verification after a rejected token", async () => {
    for (const action of ["quote", "inquiry"]) {
      fetchSpy.mockResolvedValueOnce(Response.json({ success: false, "error-codes": ["timeout-or-duplicate"] }));
      expect(await verifyTurnstile("expired-token", action)).toBe(false);
      fetchSpy.mockResolvedValueOnce(Response.json({ success: true, hostname: "caelitelube.com", action }));
      expect(await verifyTurnstile("fresh-token", action)).toBe(true);
    }
  });
});
