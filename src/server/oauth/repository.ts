import "server-only";
import { and, eq, gt, lt } from "drizzle-orm";
import type { Database } from "@/server/db";
import { oauthClients, oauthCodes, oauthRefreshTokens } from "@/server/db/schema";
import { CODE_TTL_SECONDS, REFRESH_TOKEN_TTL_SECONDS } from "./config";
import { randomToken, sha256Hex } from "./tokens";

const fromNow = (seconds: number) => new Date(Date.now() + seconds * 1000);

export async function registerClient(db: Database, client: { clientName?: string; redirectUris: string[] }) {
  const clientId = randomToken(18);
  await db.insert(oauthClients).values({
    clientId,
    clientName: client.clientName || null,
    redirectUris: client.redirectUris,
  });
  return clientId;
}

export async function findClient(db: Database, clientId: string) {
  const [client] = await db.select().from(oauthClients).where(eq(oauthClients.clientId, clientId)).limit(1);
  return client ?? null;
}

export async function createAuthorizationCode(
  db: Database,
  params: { clientId: string; redirectUri: string; codeChallenge: string; resource: string },
) {
  // Opportunistic cleanup keeps the tables small without a scheduled job.
  const now = new Date();
  await db.delete(oauthCodes).where(lt(oauthCodes.expiresAt, now));
  await db.delete(oauthRefreshTokens).where(lt(oauthRefreshTokens.expiresAt, now));

  const code = randomToken();
  await db.insert(oauthCodes).values({
    codeHash: sha256Hex(code),
    ...params,
    expiresAt: fromNow(CODE_TTL_SECONDS),
  });
  return code;
}

/** Single use: the row is deleted whether or not the caller's later checks pass. */
export async function consumeAuthorizationCode(db: Database, code: string) {
  const [row] = await db
    .delete(oauthCodes)
    .where(and(eq(oauthCodes.codeHash, sha256Hex(code)), gt(oauthCodes.expiresAt, new Date())))
    .returning();
  return row ?? null;
}

export async function createRefreshToken(db: Pick<Database, "insert">, params: { clientId: string; resource: string }) {
  const token = randomToken();
  await db.insert(oauthRefreshTokens).values({
    tokenHash: sha256Hex(token),
    ...params,
    expiresAt: fromNow(REFRESH_TOKEN_TTL_SECONDS),
  });
  return token;
}

/** Swaps a valid refresh token for a fresh one; the old token can never be used again. */
export async function rotateRefreshToken(db: Database, token: string, clientId: string) {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .delete(oauthRefreshTokens)
      .where(
        and(
          eq(oauthRefreshTokens.tokenHash, sha256Hex(token)),
          eq(oauthRefreshTokens.clientId, clientId),
          gt(oauthRefreshTokens.expiresAt, new Date()),
        ),
      )
      .returning();
    if (!row) return null;
    const next = await createRefreshToken(tx, {
      clientId: row.clientId,
      resource: row.resource,
    });
    return { refreshToken: next, resource: row.resource };
  });
}
