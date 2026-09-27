import { expect, test } from "bun:test";
import { buildQuoteEmails } from "./email";
import type { NewQuote } from "./repository";

const quote: NewQuote = {
  customer: { name: "<script>alert(1)</script>", email: "jane@example.com", phone: "+19876543210" },
  notes: "Deliver <b>fast</b>",
  items: [
    {
      sanityProductId: "p1",
      productTitle: "Oil & Coolant",
      sku: "EO-1",
      quantity: 2,
      specificationsSnapshot: { categoryPath: [], attributes: [] },
    },
  ],
};

test("builds a customer receipt and an internal notification with escaped HTML", () => {
  const [receipt, internal] = buildQuoteEmails("RFQ-2026-12345", quote, {
    sender: "DoNotReply@example.azurecomm.net",
    internalRecipient: "sales@example.com",
  });
  expect(receipt.recipients.to?.[0].address).toBe("jane@example.com");
  expect(receipt.content.subject).toContain("RFQ-2026-12345");
  expect(receipt.content.html).not.toContain("<script>");
  expect(receipt.content.html).toContain("Oil &#38; Coolant");
  expect(internal.recipients.to?.[0].address).toBe("sales@example.com");
  expect(internal.replyTo?.[0].address).toBe("jane@example.com");
  expect(internal.content.html).not.toContain("<b>");
});

test("skips the internal notification when no recipient is configured", () => {
  expect(buildQuoteEmails("RFQ-2026-12345", quote, { sender: "x@example.com" })).toHaveLength(1);
});
