import "server-only";
import { eq } from "drizzle-orm";
import type { Database } from "@/server/db";
import { isUniqueViolation } from "@/server/db/errors";
import { quoteItems, quoteRequests, type SpecificationsSnapshot } from "@/server/db/schema";
import { generateReferenceNumber } from "./reference";

export interface NewQuote {
  customer: { name: string; email: string; phone: string; city: string; company?: string };
  notes?: string;
  items: {
    sanityProductId: string;
    productTitle: string;
    sku: string | null;
    quantity: number;
    specificationsSnapshot: SpecificationsSnapshot;
  }[];
}

const MAX_REFERENCE_ATTEMPTS = 5;
const REFERENCE_CONSTRAINT = "quote_requests_reference_number_unique";
const IDEMPOTENCY_CONSTRAINT = "quote_requests_idempotency_key_unique";

/**
 * Inserts the request and its items atomically; retries on reference-number
 * collisions. A repeated `idempotencyKey` returns the original request with `duplicate: true`.
 */
export async function insertQuote(db: Database, quote: NewQuote, idempotencyKey?: string) {
  for (let attempt = 1; ; attempt++) {
    const referenceNumber = generateReferenceNumber();
    try {
      return await db.transaction(async (tx) => {
        const [request] = await tx
          .insert(quoteRequests)
          .values({
            referenceNumber,
            customerName: quote.customer.name,
            customerEmail: quote.customer.email,
            customerPhone: quote.customer.phone,
            city: quote.customer.city,
            companyName: quote.customer.company ?? null,
            notes: quote.notes ?? null,
            idempotencyKey: idempotencyKey ?? null,
          })
          .returning({ id: quoteRequests.id, referenceNumber: quoteRequests.referenceNumber });
        await tx
          .insert(quoteItems)
          .values(quote.items.map((item) => ({ ...item, quoteRequestId: request.id })));
        return { ...request, duplicate: false };
      });
    } catch (error) {
      if (idempotencyKey && isUniqueViolation(error, IDEMPOTENCY_CONSTRAINT)) {
        const [request] = await db
          .select({ id: quoteRequests.id, referenceNumber: quoteRequests.referenceNumber })
          .from(quoteRequests)
          .where(eq(quoteRequests.idempotencyKey, idempotencyKey));
        return { ...request, duplicate: true };
      }
      if (attempt < MAX_REFERENCE_ATTEMPTS && isUniqueViolation(error, REFERENCE_CONSTRAINT)) continue;
      throw error;
    }
  }
}
