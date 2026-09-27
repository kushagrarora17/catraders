import { afterAll, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { quoteItems, quoteRequests } from "@/server/db/schema";
import { REFERENCE_NUMBER_PATTERN } from "./reference";
import { insertQuote } from "./repository";

// Integration test: runs only when a database is configured (bun run db:up && bun run db:migrate).
describe.skipIf(!process.env.DATABASE_URL)("insertQuote (Postgres)", () => {
  const created: string[] = [];

  afterAll(async () => {
    const db = getDb();
    for (const id of created) await db.delete(quoteRequests).where(eq(quoteRequests.id, id));
    await db.$client.end();
  });

  test("stores the request and its items in one transaction", async () => {
    const db = getDb();
    const result = await insertQuote(db, {
      customer: { name: "Test Customer", email: "test@example.com", phone: "+10000000000" },
      items: [
        {
          sanityProductId: "test-product",
          productTitle: "Test Oil",
          sku: "TEST-1",
          quantity: 3,
          specificationsSnapshot: {
            categoryPath: ["Engine Oils"],
            attributes: [{ attribute: "Viscosity Grade", values: ["5W-30"] }],
          },
        },
      ],
    });
    created.push(result.id);

    expect(result.referenceNumber).toMatch(REFERENCE_NUMBER_PATTERN);
    const [request] = await db.select().from(quoteRequests).where(eq(quoteRequests.id, result.id));
    expect(request.status).toBe("pending");
    expect(request.companyName).toBeNull();
    const items = await db.select().from(quoteItems).where(eq(quoteItems.quoteRequestId, result.id));
    expect(items).toHaveLength(1);
    expect(items[0].specificationsSnapshot?.attributes[0].values).toEqual(["5W-30"]);
  });

  test("rejects non-positive quantities at the database level", async () => {
    const db = getDb();
    const promise = insertQuote(db, {
      customer: { name: "Test Customer", email: "test@example.com", phone: "+10000000000" },
      items: [
        {
          sanityProductId: "test-product",
          productTitle: "Test Oil",
          sku: null,
          quantity: 0,
          specificationsSnapshot: { categoryPath: [], attributes: [] },
        },
      ],
    });
    expect(promise).rejects.toThrow();
    await promise.catch(() => {});
  });
});
