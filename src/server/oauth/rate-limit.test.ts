import { describe, expect, test } from "bun:test";
import { allowAction, getClientIp } from "./rate-limit";

describe("allowAction", () => {
  test("blocks after the limit and recovers once the window passes", () => {
    const key = `test:${Math.random()}`;
    expect(allowAction(key, 2, 1000, 0)).toBe(true);
    expect(allowAction(key, 2, 1000, 100)).toBe(true);
    expect(allowAction(key, 2, 1000, 200)).toBe(false);
    expect(allowAction(key, 2, 1000, 1500)).toBe(true);
  });

  test("tracks keys independently", () => {
    const a = `test:${Math.random()}`;
    const b = `test:${Math.random()}`;
    expect(allowAction(a, 1, 1000, 0)).toBe(true);
    expect(allowAction(a, 1, 1000, 1)).toBe(false);
    expect(allowAction(b, 1, 1000, 1)).toBe(true);
  });
});

describe("getClientIp", () => {
  const request = (forwarded?: string) =>
    new Request("https://example.test", forwarded ? { headers: { "x-forwarded-for": forwarded } } : {});

  test("uses the first forwarded address and strips a port", () => {
    expect(getClientIp(request("203.0.113.9:51234, 10.0.0.1"))).toBe("203.0.113.9");
    expect(getClientIp(request("203.0.113.9"))).toBe("203.0.113.9");
    expect(getClientIp(request("[2001:db8::1]:4000"))).toBe("[2001:db8::1]");
  });

  test("falls back to a constant when the header is absent", () => {
    expect(getClientIp(request())).toBe("unknown");
  });
});
