import { afterAll, describe, expect, spyOn, test } from "bun:test";
import type { EmailMessage } from "@azure/communication-email";
import { eq } from "drizzle-orm";
import { closeDb, getDb } from "@/server/db";
import { inquiries, leadDigestCursor, quoteRequests } from "@/server/db/schema";
import { insertInquiry } from "@/server/inquiries/repository";
import { insertQuote } from "@/server/quotes/repository";
import { buildDigestEmail, listLeadsSince, runLeadDigest, type DigestLead } from "./digest";

const sender = { sender: "DoNotReply@example.azurecomm.net", internalRecipient: "sales@example.com" };

test("zero-lead digest still says 0 new leads and escapes customer text", () => {
  const leads: DigestLead[] = [
    {
      referenceNumber: "INQ-1995-00002",
      type: "INQ",
      createdAt: new Date("1995-06-02T15:00:00.000Z"),
      name: "<b>Pat</b>",
      company: "Pat & Co",
      email: "pat@example.com",
      snippet: "a".repeat(139) + "…",
    },
  ];
  const since = new Date("1995-06-01T00:00:00.000Z");
  const until = new Date("1995-06-03T00:00:00.000Z");
  const empty = buildDigestEmail([], since, until, sender);
  expect(empty.content.subject).toBe("Daily lead digest: 0 new leads");
  expect(empty.content.plainText).toContain("0 new leads.");
  expect(empty.content.plainText).toContain("No RFQs or inquiries were saved in this window.");
  expect(empty.recipients.to?.[0].address).toBe("sales@example.com");

  const message = buildDigestEmail(leads, since, until, sender);
  expect(message.content.subject).toBe("Daily lead digest: 1 new lead (0 RFQ, 1 inquiry)");
  expect(message.content.plainText).toContain("INQ-1995-00002");
  expect(message.content.plainText).toContain("Type: INQ");
  expect(message.content.plainText).toContain("Created: 1995-06-02T15:00:00.000Z");
  expect(message.content.plainText).toContain("Name: <b>Pat</b>");
  expect(message.content.plainText).toContain("Company: Pat & Co");
  expect(message.content.plainText).toContain("Email: pat@example.com");
  expect(message.content.html).not.toContain("<b>");
  expect(message.content.html).toContain("Pat &#38; Co");
});

describe.skipIf(!process.env.DATABASE_URL)("lead digest (Postgres)", () => {
  const quoteIds: string[] = [];
  const inquiryIds: string[] = [];

  afterAll(async () => {
    const db = getDb();
    for (const id of quoteIds) await db.delete(quoteRequests).where(eq(quoteRequests.id, id));
    for (const id of inquiryIds) await db.delete(inquiries).where(eq(inquiries.id, id));
    await db.delete(leadDigestCursor);
    await closeDb();
  });

  async function at(table: "quote" | "inquiry", id: string, createdAt: Date) {
    const db = getDb();
    if (table === "quote") await db.update(quoteRequests).set({ createdAt }).where(eq(quoteRequests.id, id));
    else await db.update(inquiries).set({ createdAt }).where(eq(inquiries.id, id));
  }

  test("returns RFQs and inquiries in the window with contact and a short snippet", async () => {
    const db = getDb();
    const since = new Date("1995-03-01T00:00:00.000Z");
    const until = new Date("1995-03-03T00:00:00.000Z");
    const quote = await insertQuote(db, {
      customer: { name: "Riley Quinn", email: "riley@example.com", phone: "+15195550111", city: "Windsor", company: "Quinn Motors" },
      notes: "Deliver   the drums\nnext week",
      items: [
        {
          sanityProductId: "digest-product",
          productTitle: "Bulk 5W-30",
          sku: "BULK",
          quantity: 1,
          specificationsSnapshot: { categoryPath: [], attributes: [] },
        },
      ],
    });
    quoteIds.push(quote.id);
    await at("quote", quote.id, new Date("1995-03-02T15:00:00.000Z"));

    const old = await insertQuote(db, {
      customer: { name: "Old Lead", email: "old@example.com", phone: "+10000000000", city: "Windsor" },
      items: [
        {
          sanityProductId: "digest-old",
          productTitle: "Old Oil",
          sku: null,
          quantity: 1,
          specificationsSnapshot: { categoryPath: [], attributes: [] },
        },
      ],
    });
    quoteIds.push(old.id);
    await at("quote", old.id, new Date("1995-02-01T00:00:00.000Z"));

    const bare = await insertQuote(db, {
      customer: { name: "No Notes", email: "notes@example.com", phone: "+10000000000", city: "Sarnia" },
      items: [
        {
          sanityProductId: "digest-a",
          productTitle: "Filter A",
          sku: null,
          quantity: 1,
          specificationsSnapshot: { categoryPath: [], attributes: [] },
        },
        {
          sanityProductId: "digest-b",
          productTitle: "Filter B",
          sku: null,
          quantity: 1,
          specificationsSnapshot: { categoryPath: [], attributes: [] },
        },
      ],
    });
    quoteIds.push(bare.id);
    await at("quote", bare.id, new Date("1995-03-02T16:00:00.000Z"));

    const inquiry = await insertInquiry(db, {
      name: "Avery Shaw",
      business: "Shaw Service",
      city: "London",
      email: "avery@example.com",
      phone: "519-555-0100",
      category: "Coolant",
      message: `${"word ".repeat(40)}tail`,
    });
    inquiryIds.push(inquiry.id);
    await at("inquiry", inquiry.id, new Date("1995-03-01T12:00:00.000Z"));

    const leads = await listLeadsSince(db, since, until);
    const byEmail = Object.fromEntries(leads.map((row) => [row.email, row]));
    expect(leads.map((row) => row.email)).toEqual(["avery@example.com", "riley@example.com", "notes@example.com"]);
    expect(byEmail["riley@example.com"]).toMatchObject({
      referenceNumber: quote.referenceNumber,
      type: "RFQ",
      name: "Riley Quinn",
      company: "Quinn Motors",
      snippet: "Deliver the drums next week",
    });
    expect(byEmail["notes@example.com"].company).toBeNull();
    expect(byEmail["notes@example.com"].snippet).toContain("Filter A");
    expect(byEmail["notes@example.com"].snippet).toContain("Filter B");
    expect(byEmail["avery@example.com"]).toMatchObject({
      referenceNumber: inquiry.referenceNumber,
      type: "INQ",
      company: "Shaw Service",
    });
    expect(byEmail["avery@example.com"].snippet.endsWith("…")).toBe(true);
    expect(byEmail["avery@example.com"].snippet.length).toBeLessThanOrEqual(140);
    expect(leads.some((row) => row.email === "old@example.com")).toBe(false);
  });

  test("emails the summary, then an empty digest, and keeps the window when send fails", async () => {
    const db = getDb();
    await db.delete(leadDigestCursor);
    const quote = await insertQuote(db, {
      customer: { name: "Casey Ng", email: "casey@example.com", phone: "+15195550122", city: "Windsor", company: "Ng Auto" },
      notes: "Two pails",
      items: [
        {
          sanityProductId: "digest-run",
          productTitle: "Pail",
          sku: null,
          quantity: 2,
          specificationsSnapshot: { categoryPath: [], attributes: [] },
        },
      ],
    });
    quoteIds.push(quote.id);
    await at("quote", quote.id, new Date("2000-01-01T18:00:00.000Z"));

    const sent: EmailMessage[] = [];
    const first = await runLeadDigest(() => db, {
      now: new Date("2000-01-02T13:00:00.000Z"),
      config: { connectionString: "unused", ...sender },
      send: async (message) => {
        sent.push(message);
      },
    });
    expect(first).toMatchObject({ ok: true, leadCount: 1, since: "2000-01-01T13:00:00.000Z", until: "2000-01-02T13:00:00.000Z" });
    expect(sent[0].content.subject).toContain("1 new lead");
    expect(sent[0].content.plainText).toContain(quote.referenceNumber);
    expect(sent[0].content.plainText).toContain("Type: RFQ");
    expect(sent[0].content.plainText).toContain("Name: Casey Ng");
    expect(sent[0].content.plainText).toContain("Company: Ng Auto");
    expect(sent[0].content.plainText).toContain("Email: casey@example.com");
    expect(sent[0].content.plainText).toContain("Snippet: Two pails");
    expect(sent[0].recipients.to?.[0].address).toBe("sales@example.com");

    const empty = await runLeadDigest(() => db, {
      now: new Date("2000-01-03T13:00:00.000Z"),
      config: { connectionString: "unused", ...sender },
      send: async (message) => {
        sent.push(message);
      },
    });
    expect(empty).toMatchObject({ ok: true, leadCount: 0 });
    expect(sent[1].content.subject).toBe("Daily lead digest: 0 new leads");
    expect(sent[1].content.plainText).toContain("0 new leads.");

    const error = spyOn(console, "error").mockImplementation(() => {});
    let failed: Awaited<ReturnType<typeof runLeadDigest>>;
    try {
      failed = await runLeadDigest(() => db, {
        now: new Date("2000-01-04T13:00:00.000Z"),
        config: { connectionString: "unused", ...sender },
        send: async (message) => {
          throw new Error(`accesskey ${message.content.plainText}`);
        },
      });
    } finally {
      const logged = error.mock.calls.flat().join(" ");
      error.mockRestore();
      expect(logged).toContain("[email] Failed reference=digest type=digest reason=digest_undeliverable");
      expect(logged).not.toContain("accesskey");
    }
    expect(failed!).toEqual({ ok: false, status: 502, message: "Email failed" });

    const [cursor] = await db.select().from(leadDigestCursor);
    expect(cursor.coveredThrough.toISOString()).toBe("2000-01-03T13:00:00.000Z");

    const inquiry = await insertInquiry(db, {
      name: "After Failure",
      business: "Held Leads",
      city: "Windsor",
      email: "held@example.com",
      phone: "519-555-0108",
      category: undefined,
      message: "still in the window",
    });
    inquiryIds.push(inquiry.id);
    await at("inquiry", inquiry.id, new Date("2000-01-03T18:00:00.000Z"));

    const retried: EmailMessage[] = [];
    const again = await runLeadDigest(() => db, {
      now: new Date("2000-01-04T13:00:00.000Z"),
      config: { connectionString: "unused", ...sender },
      send: async (message) => {
        retried.push(message);
      },
    });
    expect(again).toMatchObject({ ok: true, leadCount: 1, since: "2000-01-03T13:00:00.000Z" });
    expect(retried[0].content.plainText).toContain(inquiry.referenceNumber);
    expect(retried[0].content.plainText).toContain("Company: Held Leads");
  });
});
