import "server-only";
import { eq } from "drizzle-orm";
import type { Inquiry } from "@/features/inquiry/schema";
import type { Database } from "@/server/db";
import { isUniqueViolation } from "@/server/db/errors";
import { inquiries } from "@/server/db/schema";
import { generateReferenceNumber } from "@/server/quotes/reference";

export type NewInquiry = Inquiry;

const MAX_REFERENCE_ATTEMPTS = 5;
const REFERENCE_CONSTRAINT = "inquiries_reference_number_unique";
const IDEMPOTENCY_CONSTRAINT = "inquiries_idempotency_key_unique";

/**
 * Stores an inquiry; retries on reference-number collisions. A repeated
 * `idempotencyKey` returns the original row with `duplicate: true`.
 */
export async function insertInquiry(db: Database, inquiry: NewInquiry, idempotencyKey?: string) {
  for (let attempt = 1; ; attempt++) {
    try {
      const [row] = await db
        .insert(inquiries)
        .values({
          referenceNumber: generateReferenceNumber(new Date(), "INQ"),
          name: inquiry.name,
          businessName: inquiry.business,
          city: inquiry.city,
          email: inquiry.email,
          phone: inquiry.phone ?? null,
          category: inquiry.category ?? null,
          message: inquiry.message ?? null,
          idempotencyKey: idempotencyKey ?? null,
        })
        .returning({ id: inquiries.id, referenceNumber: inquiries.referenceNumber });
      return { ...row, duplicate: false };
    } catch (error) {
      if (idempotencyKey && isUniqueViolation(error, IDEMPOTENCY_CONSTRAINT)) {
        const [row] = await db
          .select({ id: inquiries.id, referenceNumber: inquiries.referenceNumber })
          .from(inquiries)
          .where(eq(inquiries.idempotencyKey, idempotencyKey));
        return { ...row, duplicate: true };
      }
      if (attempt < MAX_REFERENCE_ATTEMPTS && isUniqueViolation(error, REFERENCE_CONSTRAINT)) continue;
      throw error;
    }
  }
}
