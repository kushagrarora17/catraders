import { afterAll, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { closeDb, getDb } from "@/server/db";
import { inquiries } from "@/server/db/schema";
import { INQUIRY_REFERENCE_PATTERN } from "@/server/quotes/reference";
import { insertInquiry } from "./repository";

// Integration test: runs only when a database is configured (bun run db:up && bun run db:migrate).
describe.skipIf(!process.env.DATABASE_URL)("insertInquiry (Postgres)", () => {
  const created: string[] = [];

  afterAll(async () => {
    const db = getDb();
    for (const id of created) await db.delete(inquiries).where(eq(inquiries.id, id));
    await closeDb();
  });

  test("stores the inquiry with an INQ reference and pending status", async () => {
    const db = getDb();
    const result = await insertInquiry(db, {
      name: "Test Customer",
      business: "Test Garage",
      email: "test@example.com",
      phone: undefined,
      category: "Coolant",
      message: undefined,
    });
    created.push(result.id);

    expect(result.referenceNumber).toMatch(INQUIRY_REFERENCE_PATTERN);
    const [row] = await db.select().from(inquiries).where(eq(inquiries.id, result.id));
    expect(row.status).toBe("pending");
    expect(row.businessName).toBe("Test Garage");
    expect(row.phone).toBeNull();
    expect(row.message).toBeNull();
  });
});
