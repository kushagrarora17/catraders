import "server-only";
import type { Inquiry } from "@/features/inquiry/schema";
import type { Database } from "@/server/db";
import { isUniqueViolation } from "@/server/db/errors";
import { inquiries } from "@/server/db/schema";
import { generateReferenceNumber } from "@/server/quotes/reference";

export type NewInquiry = Inquiry;

const MAX_REFERENCE_ATTEMPTS = 5;
const REFERENCE_CONSTRAINT = "inquiries_reference_number_unique";

/** Stores an inquiry; retries on reference-number collisions. */
export async function insertInquiry(db: Database, inquiry: NewInquiry) {
  for (let attempt = 1; ; attempt++) {
    try {
      const [row] = await db
        .insert(inquiries)
        .values({
          referenceNumber: generateReferenceNumber(new Date(), "INQ"),
          name: inquiry.name,
          businessName: inquiry.business,
          email: inquiry.email,
          phone: inquiry.phone ?? null,
          category: inquiry.category ?? null,
          message: inquiry.message ?? null,
        })
        .returning({ id: inquiries.id, referenceNumber: inquiries.referenceNumber });
      return row;
    } catch (error) {
      if (attempt < MAX_REFERENCE_ATTEMPTS && isUniqueViolation(error, REFERENCE_CONSTRAINT)) continue;
      throw error;
    }
  }
}
