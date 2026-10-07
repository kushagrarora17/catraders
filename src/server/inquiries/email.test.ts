import { expect, test } from "bun:test";
import { buildInquiryEmails } from "./email";
import type { NewInquiry } from "./repository";

const inquiry: NewInquiry = {
  name: "<script>alert(1)</script>",
  business: "Smith & Sons",
  city: "Kitchener",
  email: "jane@example.com",
  phone: undefined,
  category: "Engine Oils",
  message: "Need <b>10</b> cases",
};

test("builds a customer receipt and an internal notification with escaped HTML", () => {
  const [receipt, internal] = buildInquiryEmails("INQ-2026-12345", inquiry, {
    sender: "DoNotReply@example.azurecomm.net",
    internalRecipient: "sales@example.com",
  });
  expect(receipt.recipients.to?.[0].address).toBe("jane@example.com");
  expect(receipt.content.subject).toContain("INQ-2026-12345");
  expect(receipt.content.html).not.toContain("<script>");
  expect(internal.recipients.to?.[0].address).toBe("sales@example.com");
  expect(internal.replyTo?.[0].address).toBe("jane@example.com");
  expect(internal.content.html).toContain("Smith &#38; Sons");
  expect(internal.content.html).not.toContain("<b>");
  expect(internal.content.plainText).toContain("Category: Engine Oils");
  expect(internal.content.plainText).toContain("City: Kitchener");
  expect(internal.content.plainText).not.toContain("Phone:");
});

test("skips the internal notification when no recipient is configured", () => {
  expect(buildInquiryEmails("INQ-2026-12345", inquiry, { sender: "x@example.com" })).toHaveLength(1);
});
