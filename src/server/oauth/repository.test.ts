import { afterAll, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { closeDb, getDb } from "@/server/db";
import { oauthClients, oauthCodes, oauthRefreshTokens } from "@/server/db/schema";
import {
  consumeAuthorizationCode,
  createAuthorizationCode,
  createRefreshToken,
  findClient,
  registerClient,
  rotateRefreshToken,
} from "./repository";
import { sha256Hex } from "./tokens";

// Integration test: runs only when a database is configured (bun run db:up && bun run db:migrate).
describe.skipIf(!process.env.DATABASE_URL)("OAuth repository (Postgres)", () => {
  const clientIds: string[] = [];

  async function newClient() {
    const clientId = await registerClient(getDb(), {
      clientName: "Test client",
      redirectUris: ["https://claude.ai/api/mcp/auth_callback"],
    });
    clientIds.push(clientId);
    return clientId;
  }

  afterAll(async () => {
    const db = getDb();
    for (const clientId of clientIds) {
      await db.delete(oauthCodes).where(eq(oauthCodes.clientId, clientId));
      await db.delete(oauthRefreshTokens).where(eq(oauthRefreshTokens.clientId, clientId));
      await db.delete(oauthClients).where(eq(oauthClients.clientId, clientId));
    }
    await closeDb();
  });

  test("stores and finds a registered client", async () => {
    const clientId = await newClient();
    const client = await findClient(getDb(), clientId);
    expect(client?.clientName).toBe("Test client");
    expect(client?.redirectUris).toEqual(["https://claude.ai/api/mcp/auth_callback"]);
    expect(await findClient(getDb(), "does-not-exist")).toBeNull();
  });

  test("authorization codes are single use and stored hashed", async () => {
    const db = getDb();
    const clientId = await newClient();
    const code = await createAuthorizationCode(db, {
      clientId,
      redirectUri: "https://claude.ai/api/mcp/auth_callback",
      codeChallenge: "c".repeat(43),
      resource: "https://example.test/api/mcp",
    });

    const [stored] = await db.select().from(oauthCodes).where(eq(oauthCodes.codeHash, sha256Hex(code)));
    expect(stored.codeHash).not.toBe(code);

    expect((await consumeAuthorizationCode(db, code))?.clientId).toBe(clientId);
    expect(await consumeAuthorizationCode(db, code)).toBeNull();
  });

  test("expired authorization codes are not accepted", async () => {
    const db = getDb();
    const clientId = await newClient();
    const code = await createAuthorizationCode(db, {
      clientId,
      redirectUri: "https://claude.ai/api/mcp/auth_callback",
      codeChallenge: "c".repeat(43),
      resource: "https://example.test/api/mcp",
    });
    await db
      .update(oauthCodes)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(oauthCodes.codeHash, sha256Hex(code)));
    expect(await consumeAuthorizationCode(db, code)).toBeNull();
  });

  test("refresh tokens rotate: the old one dies, the new one works", async () => {
    const db = getDb();
    const clientId = await newClient();
    const first = await createRefreshToken(db, { clientId, resource: "https://example.test/api/mcp" });

    const rotated = await rotateRefreshToken(db, first, clientId);
    expect(rotated?.resource).toBe("https://example.test/api/mcp");
    expect(rotated?.refreshToken).not.toBe(first);

    expect(await rotateRefreshToken(db, first, clientId)).toBeNull();
    expect(await rotateRefreshToken(db, rotated!.refreshToken, clientId)).not.toBeNull();
  });

  test("a refresh token can't be redeemed by another client, and isn't consumed by trying", async () => {
    const db = getDb();
    const owner = await newClient();
    const other = await newClient();
    const token = await createRefreshToken(db, { clientId: owner, resource: "https://example.test/api/mcp" });

    expect(await rotateRefreshToken(db, token, other)).toBeNull();
    expect(await rotateRefreshToken(db, token, owner)).not.toBeNull();
  });
});
