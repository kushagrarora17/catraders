import "server-only";
import { and, count, desc, eq, gte } from "drizzle-orm";
import type { Database } from "@/server/db";
import { inquiries, quoteItems, quoteRequests } from "@/server/db/schema";

type Status = typeof quoteRequests.$inferSelect.status;
interface Filter {
  status?: Status;
  since?: Date;
  limit: number;
}

export function listQuotes(db: Database, { status, since, limit }: Filter) {
  return db
    .select({
      reference: quoteRequests.referenceNumber,
      status: quoteRequests.status,
      name: quoteRequests.customerName,
      email: quoteRequests.customerEmail,
      phone: quoteRequests.customerPhone,
      city: quoteRequests.city,
      company: quoteRequests.companyName,
      createdAt: quoteRequests.createdAt,
      itemCount: count(quoteItems.id),
    })
    .from(quoteRequests)
    .leftJoin(quoteItems, eq(quoteItems.quoteRequestId, quoteRequests.id))
    .where(and(status && eq(quoteRequests.status, status), since && gte(quoteRequests.createdAt, since)))
    .groupBy(quoteRequests.id)
    .orderBy(desc(quoteRequests.createdAt))
    .limit(limit);
}

export function listInquiries(db: Database, { status, since, limit }: Filter) {
  return db
    .select({
      reference: inquiries.referenceNumber,
      status: inquiries.status,
      name: inquiries.name,
      business: inquiries.businessName,
      email: inquiries.email,
      phone: inquiries.phone,
      city: inquiries.city,
      category: inquiries.category,
      createdAt: inquiries.createdAt,
    })
    .from(inquiries)
    .where(and(status && eq(inquiries.status, status), since && gte(inquiries.createdAt, since)))
    .orderBy(desc(inquiries.createdAt))
    .limit(limit);
}

export async function getQuote(db: Database, reference: string) {
  const [quote] = await db.select().from(quoteRequests).where(eq(quoteRequests.referenceNumber, reference)).limit(1);
  if (!quote) return null;
  const items = await db
    .select({
      productId: quoteItems.sanityProductId,
      title: quoteItems.productTitle,
      sku: quoteItems.sku,
      quantity: quoteItems.quantity,
      specifications: quoteItems.specificationsSnapshot,
    })
    .from(quoteItems)
    .where(eq(quoteItems.quoteRequestId, quote.id));
  const publicQuote: Partial<typeof quote> = { ...quote };
  delete publicQuote.id; // internal; the reference number is the public identifier
  return { ...publicQuote, items };
}

export async function getInquiry(db: Database, reference: string) {
  const [inquiry] = await db.select().from(inquiries).where(eq(inquiries.referenceNumber, reference)).limit(1);
  if (!inquiry) return null;
  const publicInquiry: Partial<typeof inquiry> = { ...inquiry };
  delete publicInquiry.id;
  return publicInquiry;
}

/** Sets the status and returns the previous one, or null if there's no such request. */
export async function setRequestStatus(db: Database, kind: "quote" | "inquiry", reference: string, status: Status) {
  if (kind === "quote") {
    const [current] = await db
      .select({ status: quoteRequests.status })
      .from(quoteRequests)
      .where(eq(quoteRequests.referenceNumber, reference))
      .limit(1);
    if (!current) return null;
    if (current.status !== status) {
      await db.update(quoteRequests).set({ status }).where(eq(quoteRequests.referenceNumber, reference));
    }
    return current.status;
  }

  const [current] = await db
    .select({ status: inquiries.status })
    .from(inquiries)
    .where(eq(inquiries.referenceNumber, reference))
    .limit(1);
  if (!current) return null;
  if (current.status !== status) {
    await db.update(inquiries).set({ status }).where(eq(inquiries.referenceNumber, reference));
  }
  return current.status;
}
