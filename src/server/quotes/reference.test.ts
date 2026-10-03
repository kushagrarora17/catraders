import { expect, test } from "bun:test";
import { generateReferenceNumber, INQUIRY_REFERENCE_PATTERN, REFERENCE_NUMBER_PATTERN } from "./reference";

test("generates RFQ-YYYY-NNNNN references that fit the 20-char column", () => {
  for (let i = 0; i < 100; i++) {
    const ref = generateReferenceNumber(new Date("2026-03-01T00:00:00Z"));
    expect(ref).toMatch(REFERENCE_NUMBER_PATTERN);
    expect(ref.startsWith("RFQ-2026-")).toBe(true);
    expect(ref.length).toBeLessThanOrEqual(20);
  }
});

test("supports the INQ prefix for inquiries", () => {
  const ref = generateReferenceNumber(new Date("2026-03-01T00:00:00Z"), "INQ");
  expect(ref).toMatch(INQUIRY_REFERENCE_PATTERN);
});
