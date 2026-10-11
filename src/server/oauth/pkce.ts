import "server-only";
import { createHash } from "node:crypto";
import { safeEqual } from "./tokens";

const VERIFIER_PATTERN = /^[A-Za-z0-9\-._~]{43,128}$/;
export const CHALLENGE_PATTERN = /^[A-Za-z0-9\-_]{43}$/;

/** RFC 7636 S256: BASE64URL(SHA256(verifier)) must equal the challenge sent at /authorize. */
export function verifyPkceS256(verifier: string, challenge: string) {
  if (!VERIFIER_PATTERN.test(verifier)) return false;
  return safeEqual(createHash("sha256").update(verifier).digest("base64url"), challenge);
}
