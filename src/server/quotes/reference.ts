import { randomInt } from "node:crypto";

export const REFERENCE_NUMBER_PATTERN = /^RFQ-\d{4}-\d{5}$/;
export const INQUIRY_REFERENCE_PATTERN = /^INQ-\d{4}-\d{5}$/;

/** e.g. RFQ-2026-90214 (quotes) or INQ-2026-90214 (landing-page inquiries) */
export function generateReferenceNumber(now = new Date(), prefix: "RFQ" | "INQ" = "RFQ") {
  return `${prefix}-${now.getUTCFullYear()}-${randomInt(10_000, 100_000)}`;
}
