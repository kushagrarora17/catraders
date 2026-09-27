import "server-only";
import { EmailClient, type EmailMessage } from "@azure/communication-email";
import type { NewQuote } from "./repository";

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function renderItems(quote: NewQuote) {
  const text = quote.items
    .map((i) => `- ${i.productTitle}${i.sku ? ` (${i.sku})` : ""} × ${i.quantity}`)
    .join("\n");
  const html = `<ul>${quote.items
    .map(
      (i) =>
        `<li>${escapeHtml(i.productTitle)}${i.sku ? ` (${escapeHtml(i.sku)})` : ""} × ${i.quantity}</li>`,
    )
    .join("")}</ul>`;
  return { text, html };
}

export function buildQuoteEmails(
  referenceNumber: string,
  quote: NewQuote,
  config: { sender: string; internalRecipient?: string },
): EmailMessage[] {
  const items = renderItems(quote);
  const { customer } = quote;
  const messages: EmailMessage[] = [
    {
      senderAddress: config.sender,
      recipients: { to: [{ address: customer.email, displayName: customer.name }] },
      content: {
        subject: `We received your quote request ${referenceNumber}`,
        plainText: `Hi ${customer.name},\n\nThanks for your request. Our team will get back to you shortly.\n\nReference: ${referenceNumber}\n\n${items.text}\n`,
        html: `<p>Hi ${escapeHtml(customer.name)},</p><p>Thanks for your request. Our team will get back to you shortly.</p><p>Reference: <strong>${referenceNumber}</strong></p>${items.html}`,
      },
    },
  ];

  if (config.internalRecipient) {
    const details = [
      `Name: ${customer.name}`,
      `Email: ${customer.email}`,
      `Phone: ${customer.phone}`,
      customer.company && `Company: ${customer.company}`,
      quote.notes && `Notes: ${quote.notes}`,
    ].filter((line): line is string => Boolean(line));
    messages.push({
      senderAddress: config.sender,
      recipients: { to: [{ address: config.internalRecipient }] },
      replyTo: [{ address: customer.email, displayName: customer.name }],
      content: {
        subject: `New quote request ${referenceNumber}`,
        plainText: `${details.join("\n")}\n\n${items.text}\n`,
        html: `<p>${details.map(escapeHtml).join("<br>")}</p>${items.html}`,
      },
    });
  }
  return messages;
}

/** Sends the customer receipt and internal notification. Never throws. */
export async function sendQuoteEmails(referenceNumber: string, quote: NewQuote) {
  const connectionString = process.env.AZURE_COMMUNICATION_CONNECTION_STRING;
  const sender = process.env.EMAIL_SENDER_ADDRESS;
  if (!connectionString || !sender) {
    console.info(`[quotes] Email not configured; skipping notifications for ${referenceNumber}`);
    return;
  }

  const client = new EmailClient(connectionString);
  const messages = buildQuoteEmails(referenceNumber, quote, {
    sender,
    internalRecipient: process.env.QUOTE_NOTIFICATION_EMAIL || undefined,
  });
  const results = await Promise.allSettled(
    messages.map(async (message) => (await client.beginSend(message)).pollUntilDone()),
  );
  for (const result of results) {
    if (result.status === "rejected") {
      console.error(`[quotes] Failed to send email for ${referenceNumber}`, result.reason);
    }
  }
}
