import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { createFormAbuseControl } from "./form-abuse";

describe("public form abuse controls", () => {
  let control: ReturnType<typeof createFormAbuseControl>;
  let warn: ReturnType<typeof spyOn<typeof console, "warn">>;
  let info: ReturnType<typeof spyOn<typeof console, "info">>;
  const email = "kush-claude@agentmail.to";

  beforeEach(() => {
    control = createFormAbuseControl();
    warn = spyOn(console, "warn").mockImplementation(() => {});
    info = spyOn(console, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    warn.mockRestore();
    info.mockRestore();
  });

  test("shares attempt capacity between forms and recovers at the window boundary", async () => {
    for (let i = 0; i < 60; i++) expect(control.attempt(i % 2 ? "quote" : "inquiry", 0)).toBeNull();
    const rejected = control.attempt("quote", 1)!;
    expect(rejected.status).toBe(429);
    expect(rejected.headers.get("Retry-After")).toBe("60");
    expect(rejected.headers.get("Cache-Control")).toBe("no-store");
    expect(await rejected.json()).toMatchObject({ success: false, error: "RATE_LIMITED" });
    expect(control.attempt("inquiry", 59_999)?.headers.get("Retry-After")).toBe("1");
    expect(control.attempt("inquiry", 60_000)).toBeNull();
  });

  test("shares normalized recipient limits across forms without blocking other customers", () => {
    expect(control.submission("quote", email, 0)).toBeNull();
    expect(control.submission("inquiry", ` ${email.toUpperCase()} `, 1000)).toBeNull();
    expect(control.submission("quote", email, 2000)).toBeNull();
    expect(control.submission("inquiry", email, 3000)?.status).toBe(429);
    expect(control.submission("inquiry", `other+${email}`, 3000)).toBeNull();
    expect(control.submission("quote", email, 899_999)?.headers.get("Retry-After")).toBe("1");
    expect(control.submission("inquiry", email, 900_000)).toBeNull();
    expect(control.submission("quote", email, 900_000)?.status).toBe(429);
  });

  test("bounds verified submissions even with rotating recipients and allows recovery", () => {
    for (let i = 0; i < 30; i++) expect(control.submission(i % 2 ? "quote" : "inquiry", `${i}+${email}`, 0)).toBeNull();
    expect(control.submission("quote", email, 1)?.status).toBe(429);
    expect(control.submission("inquiry", email, 899_999)?.headers.get("Retry-After")).toBe("1");
    expect(control.submission("inquiry", email, 900_000)).toBeNull();
    expect(warn.mock.calls.flat().join(" ")).toContain("outcome=submission_limit");
  });

  test("attempt failures do not consume verified capacity and events expose no recipient data", async () => {
    for (let i = 0; i < 61; i++) control.attempt("inquiry", 0);
    for (let i = 0; i < 3; i++) expect(control.submission("quote", email, 0)).toBeNull();
    const rejected = control.submission("inquiry", email, 0)!;
    const output = [...warn.mock.calls, ...info.mock.calls].flat().join(" ") + await rejected.text();
    expect(output).not.toContain(email);
    expect(output).not.toContain("agentmail");
    expect(warn.mock.calls).toContainEqual(["[form-abuse] form=inquiry outcome=recipient_limit"]);
    expect(info.mock.calls[0]).toEqual(["[form-abuse] form=quote outcome=admitted"]);
  });
});
