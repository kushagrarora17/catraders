import { afterEach, expect, spyOn, test } from "bun:test";
import type { EmailMessage } from "@azure/communication-email";
import { sendInquiryEmails } from "@/server/inquiries/email";
import type { NewInquiry } from "@/server/inquiries/repository";
import { sendQuoteEmails } from "@/server/quotes/email";
import type { NewQuote } from "@/server/quotes/repository";
import { sendLeadEmails, type EmailConfig, type EmailSender, type LeadNotice } from "./send";

const occurredAt = new Date("2026-11-06T12:00:00.000Z");
const config: EmailConfig = {
  connectionString: "endpoint=https://example.communication.azure.com/;accesskey=not-a-real-secret",
  sender: "DoNotReply@example.azurecomm.net",
  internalRecipient: "sales@example.com",
};
const quote: NewQuote = {
  customer: { name: "Jane Doe", email: "jane@example.com", phone: "+15195550100", city: "Windsor", company: "Doe Garage" },
  notes: "UNIQUE-BODY pallet of 5W-30",
  items: [
    {
      sanityProductId: "p1",
      productTitle: "Edge 5W-30",
      sku: "EO-1",
      quantity: 2,
      specificationsSnapshot: { categoryPath: [], attributes: [] },
    },
  ],
};
const inquiry: NewInquiry = {
  name: "Sam Lee",
  business: "Lee Auto",
  city: "London",
  email: "sam@example.com",
  phone: "519-555-0199",
  category: "Filters (Oil / Cabin / Engine)",
  message: "UNIQUE-BODY need filters",
};
const lead: LeadNotice = {
  referenceNumber: "RFQ-2026-11111",
  leadType: "quote",
  occurredAt,
  contact: { name: "Jane Doe", email: "jane@example.com", phone: "+15195550100", company: "Doe Garage" },
};

let error: ReturnType<typeof spyOn<typeof console, "error">> | undefined;
afterEach(() => {
  error?.mockRestore();
  error = undefined;
});

function captureErrors() {
  error = spyOn(console, "error").mockImplementation(() => {});
}

function logged() {
  if (!error) throw new Error("console.error was not captured");
  return error.mock.calls.flat().join(" ");
}

test("retries a failed receipt once and does not alert when the retry works", async () => {
  captureErrors();
  const attempts = new Map<string, number>();
  const send: EmailSender = async (message) => {
    const subject = message.content.subject;
    const count = (attempts.get(subject) ?? 0) + 1;
    attempts.set(subject, count);
    if (subject.startsWith("We received") && count === 1) throw new Error("transient");
  };
  await sendQuoteEmails("RFQ-2026-11111", quote, { config, send, now: occurredAt });
  expect(attempts.get("We received your quote request RFQ-2026-11111")).toBe(2);
  expect(attempts.get("New quote request RFQ-2026-11111")).toBe(1);
  expect(logged()).not.toContain("[email] Failed");
});

test("alerts the internal inbox when a notice still fails after one retry", async () => {
  captureErrors();
  const sent: EmailMessage[] = [];
  const send: EmailSender = async (message) => {
    sent.push(message);
    if (!message.content.subject.startsWith("Email failed")) throw new Error(`accesskey body ${message.content.plainText}`);
  };
  await sendQuoteEmails("RFQ-2026-11111", quote, { config, send, now: occurredAt });

  const alert = sent.at(-1)!;
  expect(alert.content.subject).toBe("Email failed for RFQ-2026-11111");
  expect(alert.recipients.to?.[0].address).toBe("sales@example.com");
  expect(alert.content.plainText).toContain("Type: quote");
  expect(alert.content.plainText).toContain("Id: RFQ-2026-11111");
  expect(alert.content.plainText).toContain("Timestamp: 2026-11-06T12:00:00.000Z");
  expect(alert.content.plainText).toContain("Name: Jane Doe");
  expect(alert.content.plainText).toContain("Email: jane@example.com");
  expect(alert.content.plainText).toContain("Phone: +15195550100");
  expect(alert.content.plainText).toContain("Company: Doe Garage");
  expect(alert.content.plainText).not.toContain("UNIQUE-BODY");
  expect(sent.filter((message) => message.content.subject === "New quote request RFQ-2026-11111")).toHaveLength(2);
  expect(logged()).not.toContain("[email] Failed");
  expect(logged()).not.toContain("accesskey");
});

test("logs the lead id when the failure alert cannot be sent", async () => {
  captureErrors();
  const send: EmailSender = async (message) => {
    throw new Error(`accesskey=secret UNIQUE-BODY ${message.content.plainText}`);
  };
  await sendInquiryEmails("INQ-2026-22222", inquiry, { config, send, now: occurredAt });
  expect(logged()).toContain("[email] Failed reference=INQ-2026-22222 type=inquiry reason=alert_undeliverable");
  expect(logged()).not.toContain("accesskey");
  expect(logged()).not.toContain("UNIQUE-BODY");
  expect(logged()).not.toContain("sam@example.com");
});

test("logs the lead id when email is not configured", async () => {
  captureErrors();
  const send: EmailSender = async () => {
    throw new Error("should not be called");
  };
  await sendLeadEmails([], lead, { config: null, send });
  expect(logged()).toContain("[email] Failed reference=RFQ-2026-11111 type=quote reason=email_not_configured");
  expect(logged()).not.toContain("should not be called");
});

test("logs the lead id when the connection string cannot build a client", async () => {
  captureErrors();
  await sendLeadEmails([], lead, {
    config: { ...config, connectionString: "endpoint=secret-connection-string" },
  });
  expect(logged()).toContain("[email] Failed reference=RFQ-2026-11111 type=quote reason=email_not_configured");
  expect(logged()).not.toContain("secret-connection-string");
});

test("logs when the internal inbox is unset so the alert has nowhere to go", async () => {
  captureErrors();
  let calls = 0;
  const send: EmailSender = async () => {
    calls += 1;
  };
  await sendQuoteEmails("RFQ-2026-11111", quote, {
    config: { ...config, internalRecipient: undefined },
    send,
    now: occurredAt,
  });
  expect(calls).toBe(1);
  expect(logged()).toContain("[email] Failed reference=RFQ-2026-11111 type=quote reason=alert_not_configured");
});
