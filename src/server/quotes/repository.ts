import "server-only";
import type { Database } from "@/server/db";
import { quoteItems, quoteRequests, type SpecificationsSnapshot } from "@/server/db/schema";
import { generateReferenceNumber } from "./reference";

export interface NewQuote {
  customer: { name: string; email: string; phone: string; company?: string };
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

function isReferenceCollision(error: unknown) {
  // Drizzle wraps driver errors; the pg error may be the error itself or its cause.
  for (let e: unknown = error; e; e = (e as { cause?: unknown }).cause) {
    const pgError = e as { code?: string; constraint?: string };
    if (pgError.code === "23505" && pgError.constraint === REFERENCE_CONSTRAINT) return true;
  }
  return false;
}

/** Inserts the request and its items atomically; retries on reference-number collisions. */
export async function insertQuote(db: Database, quote: NewQuote) {
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
            companyName: quote.customer.company ?? null,
            notes: quote.notes ?? null,
          })
          .returning({ id: quoteRequests.id, referenceNumber: quoteRequests.referenceNumber });
        await tx
          .insert(quoteItems)
          .values(quote.items.map((item) => ({ ...item, quoteRequestId: request.id })));
        return request;
      });
    } catch (error) {
      if (attempt < MAX_REFERENCE_ATTEMPTS && isReferenceCollision(error)) continue;
      throw error;
    }
  }
}
