import { afterAll, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { closeDb, getDb } from "@/server/db";
import { inquiries, quoteRequests } from "@/server/db/schema";
import { insertInquiry } from "@/server/inquiries/repository";
import { insertQuote } from "@/server/quotes/repository";
import { getInquiry, getQuote, listInquiries, listQuotes, setRequestStatus } from "./requests";

const item = (sku: string, quantity: number) => ({
  sanityProductId: `test-${sku}`,
  productTitle: `Test ${sku}`,
  sku,
  quantity,
  specificationsSnapshot: { categoryPath: ["Engine Oils"], attributes: [{ attribute: "Viscosity Grade", values: ["5W-30"] }] },
});

// Integration test: runs only when a database is configured (bun run db:up && bun run db:migrate).
describe.skipIf(!process.env.DATABASE_URL)("MCP request queries (Postgres)", () => {
  const quoteIds: string[] = [];
  const inquiryRefs: string[] = [];

  afterAll(async () => {
    const db = getDb();
    for (const id of quoteIds) await db.delete(quoteRequests).where(eq(quoteRequests.id, id));
    for (const ref of inquiryRefs) await db.delete(inquiries).where(eq(inquiries.referenceNumber, ref));
    await closeDb();
  });

  async function newQuote(items: ReturnType<typeof item>[]) {
    const quote = await insertQuote(getDb(), {
      customer: { name: "MCP Test", email: "mcp-test@example.com", phone: "+10000000000", city: "Windsor" },
      items,
    });
    quoteIds.push(quote.id);
    return quote;
  }

  test("listQuotes counts each quote's own items", async () => {
    const two = await newQuote([item("A", 1), item("B", 4)]);
    const one = await newQuote([item("C", 2)]);

    const rows = await listQuotes(getDb(), { limit: 100 });
    expect(rows.find((r) => r.reference === two.referenceNumber)?.itemCount).toBe(2);
    expect(rows.find((r) => r.reference === one.referenceNumber)?.itemCount).toBe(1);
  });

  test("listQuotes filters by status and since, newest first", async () => {
    const quote = await newQuote([item("D", 1)]);
    await setRequestStatus(getDb(), "quote", quote.referenceNumber, "quoted");

    const quoted = await listQuotes(getDb(), { status: "quoted", limit: 100 });
    expect(quoted.some((r) => r.reference === quote.referenceNumber)).toBe(true);
    expect(quoted.every((r) => r.status === "quoted")).toBe(true);

    const future = await listQuotes(getDb(), { since: new Date(Date.now() + 60_000), limit: 100 });
    expect(future).toEqual([]);

    const all = await listQuotes(getDb(), { limit: 100 });
    const times = all.map((r) => r.createdAt.getTime());
    expect(times).toEqual([...times].sort((a, b) => b - a));
  });

  test("getQuote returns items with their specification snapshots and hides the internal id", async () => {
    const quote = await newQuote([item("E", 3)]);
    const found = await getQuote(getDb(), quote.referenceNumber);
    expect(found?.items).toEqual([
      {
        productId: "test-E",
        title: "Test E",
        sku: "E",
        quantity: 3,
        specifications: { categoryPath: ["Engine Oils"], attributes: [{ attribute: "Viscosity Grade", values: ["5W-30"] }] },
      },
    ]);
    expect(found).not.toHaveProperty("id");
    expect(await getQuote(getDb(), "RFQ-0000-00000")).toBeNull();
  });

  test("setRequestStatus reports the previous status and leaves unknown references alone", async () => {
    const quote = await newQuote([item("F", 1)]);
    expect(await setRequestStatus(getDb(), "quote", quote.referenceNumber, "under_review")).toBe("pending");
    expect(await setRequestStatus(getDb(), "quote", quote.referenceNumber, "under_review")).toBe("under_review");
    expect(await setRequestStatus(getDb(), "quote", "RFQ-0000-00000", "closed")).toBeNull();
  });

  test("inquiries can be listed, fetched and moved through statuses", async () => {
    const inquiry = await insertInquiry(getDb(), {
      name: "MCP Test",
      business: "Test Auto",
      email: "mcp-test@example.com",
      city: "London",
      phone: "(519) 555-0000",
      category: undefined,
      message: "Hello",
    });
    inquiryRefs.push(inquiry.referenceNumber);

    expect((await listInquiries(getDb(), { limit: 100 })).some((r) => r.reference === inquiry.referenceNumber)).toBe(true);
    expect((await getInquiry(getDb(), inquiry.referenceNumber))?.businessName).toBe("Test Auto");
    expect(await setRequestStatus(getDb(), "inquiry", inquiry.referenceNumber, "closed")).toBe("pending");
  });
});
