import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { CHALLENGE_PATTERN, verifyPkceS256 } from "./pkce";

const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
// RFC 7636 appendix B test vector.
const challenge = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";

describe("verifyPkceS256", () => {
  test("accepts the RFC 7636 test vector", () => {
    expect(verifyPkceS256(verifier, challenge)).toBe(true);
    expect(challenge).toMatch(CHALLENGE_PATTERN);
  });

  test("rejects a different verifier or challenge", () => {
    expect(verifyPkceS256(`${verifier.slice(0, -1)}A`, challenge)).toBe(false);
    expect(verifyPkceS256(verifier, createHash("sha256").update("x").digest("base64url"))).toBe(false);
  });

  test("rejects verifiers outside the 43–128 unreserved-character format", () => {
    expect(verifyPkceS256("short", createHash("sha256").update("short").digest("base64url"))).toBe(false);
    expect(verifyPkceS256(`${verifier}!`, challenge)).toBe(false);
  });
});
