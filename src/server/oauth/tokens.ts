import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { type OAuthTokenVerifier, OAuthError, OAuthErrorCode } from "@modelcontextprotocol/server";
import { jwtVerify, SignJWT, type JWTPayload } from "jose";
import { ACCESS_TOKEN_TTL_SECONDS, getIssuer, getJwtSecret, MCP_SCOPE } from "./config";
import { isActiveOperator, normalizeOperatorEmail } from "./operators";

export const sha256Hex = (value: string) => createHash("sha256").update(value).digest("hex");

/** URL-safe random secret (authorization codes, refresh tokens, client ids). */
export const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");

/** Constant-time string comparison that doesn't leak length. */
export function safeEqual(a: string, b: string) {
  return timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());
}

export async function signAccessToken(params: { clientId: string; resource: string; operatorEmail: string; operatorRevision: string }) {
  return new SignJWT({ client_id: params.clientId, scope: MCP_SCOPE, operator_email: normalizeOperatorEmail(params.operatorEmail), operator_revision: params.operatorRevision })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(getIssuer())
    .setAudience(params.resource)
    .setSubject(normalizeOperatorEmail(params.operatorEmail))
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(getJwtSecret());
}

type OperatorClaims = JWTPayload & { client_id: string; operator_email: string; operator_revision: string };

function operatorClaims(payload: JWTPayload): OperatorClaims {
  for (const field of ["client_id", "operator_email", "operator_revision"]) {
    if (typeof payload[field] !== "string") throw new Error("Malformed token");
  }
  return payload as OperatorClaims;
}

function accessClaims(payload: JWTPayload) {
  const audience = Array.isArray(payload.aud) ? payload.aud[0] : payload.aud;
  if (!audience || !payload.exp) throw new Error("Malformed token");
  return { claims: operatorClaims(payload), audience, expiresAt: payload.exp };
}

function tokenScopes(payload: JWTPayload) {
  return typeof payload.scope === "string" ? payload.scope.split(" ") : [];
}

/** Verifies signature, issuer, expiry and that the token was minted for the MCP resource. */
export function createAccessTokenVerifier(checkOperator: typeof isActiveOperator = isActiveOperator): OAuthTokenVerifier {
  return {
    async verifyAccessToken(token) {
    try {
      const { payload } = await jwtVerify(token, getJwtSecret(), {
        algorithms: ["HS256"],
        issuer: getIssuer(),
      });
      const { claims, audience, expiresAt } = accessClaims(payload);
      const operatorEmail = normalizeOperatorEmail(claims.operator_email);
      if (payload.sub !== operatorEmail || !(await checkOperator(operatorEmail, claims.operator_revision))) throw new Error("Operator access revoked");
      return {
        token,
        clientId: claims.client_id,
        scopes: tokenScopes(payload),
        expiresAt,
        resource: new URL(audience),
        extra: { operatorEmail },
      };
    } catch {
      throw new OAuthError(OAuthErrorCode.InvalidToken, "Invalid or expired access token");
    }
    },
  };
}

export const accessTokenVerifier = createAccessTokenVerifier();
