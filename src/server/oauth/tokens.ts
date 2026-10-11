import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { type OAuthTokenVerifier, OAuthError, OAuthErrorCode } from "@modelcontextprotocol/server";
import { jwtVerify, SignJWT } from "jose";
import { ACCESS_TOKEN_TTL_SECONDS, getIssuer, getJwtSecret, MCP_SCOPE } from "./config";

export const sha256Hex = (value: string) => createHash("sha256").update(value).digest("hex");

/** URL-safe random secret (authorization codes, refresh tokens, client ids). */
export const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");

/** Constant-time string comparison that doesn't leak length. */
export function safeEqual(a: string, b: string) {
  return timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());
}

export async function signAccessToken(params: { clientId: string; resource: string }) {
  return new SignJWT({ client_id: params.clientId, scope: MCP_SCOPE })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(getIssuer())
    .setAudience(params.resource)
    .setSubject("admin")
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(getJwtSecret());
}

/** Verifies signature, issuer, expiry and that the token was minted for the MCP resource. */
export const accessTokenVerifier: OAuthTokenVerifier = {
  async verifyAccessToken(token) {
    try {
      const { payload } = await jwtVerify(token, getJwtSecret(), {
        algorithms: ["HS256"],
        issuer: getIssuer(),
      });
      const audience = Array.isArray(payload.aud) ? payload.aud[0] : payload.aud;
      if (!audience || !payload.exp || typeof payload.client_id !== "string") {
        throw new Error("Malformed token");
      }
      return {
        token,
        clientId: payload.client_id,
        scopes: typeof payload.scope === "string" ? payload.scope.split(" ") : [],
        expiresAt: payload.exp,
        resource: new URL(audience),
      };
    } catch {
      throw new OAuthError(OAuthErrorCode.InvalidToken, "Invalid or expired access token");
    }
  },
};
