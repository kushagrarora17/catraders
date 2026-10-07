import "server-only";
import type { EmailMessage } from "@azure/communication-email";
import { escapeHtml, getEmailConfig, sendEmails } from "@/server/email/send";
import type { NewQuote } from "./repository";

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
      `City: ${customer.city}`,
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
  const config = getEmailConfig();
  if (!config) {
    console.info(`[quotes] Email not configured; skipping notifications for ${referenceNumber}`);
    return;
  }
  await sendEmails(config.connectionString, buildQuoteEmails(referenceNumber, quote, config), referenceNumber);
}
