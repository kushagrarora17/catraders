import { randomInt } from "node:crypto";

export const REFERENCE_NUMBER_PATTERN = /^RFQ-\d{4}-\d{5}$/;

/** e.g. RFQ-2026-90214 */
export function generateReferenceNumber(now = new Date()) {
  return `RFQ-${now.getUTCFullYear()}-${randomInt(10_000, 100_000)}`;
}
