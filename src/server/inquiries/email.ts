import "server-only";
import type { EmailMessage } from "@azure/communication-email";
import { escapeHtml, getEmailConfig, sendEmails } from "@/server/email/send";
import type { NewInquiry } from "./repository";

export function buildInquiryEmails(
  referenceNumber: string,
  inquiry: NewInquiry,
  config: { sender: string; internalRecipient?: string },
): EmailMessage[] {
  const messages: EmailMessage[] = [
    {
      senderAddress: config.sender,
      recipients: { to: [{ address: inquiry.email, displayName: inquiry.name }] },
      content: {
        subject: `We received your inquiry ${referenceNumber}`,
        plainText: `Hi ${inquiry.name},\n\nThanks for reaching out to CA Traders. We'll get back to you with wholesale pricing within 24 hours.\n\nReference: ${referenceNumber}\n`,
        html: `<p>Hi ${escapeHtml(inquiry.name)},</p><p>Thanks for reaching out to CA Traders. We'll get back to you with wholesale pricing within 24 hours.</p><p>Reference: <strong>${referenceNumber}</strong></p>`,
      },
    },
  ];

  if (config.internalRecipient) {
    const details = [
      `Name: ${inquiry.name}`,
      `Business: ${inquiry.business}`,
      `City: ${inquiry.city}`,
      `Email: ${inquiry.email}`,
      inquiry.phone && `Phone: ${inquiry.phone}`,
      inquiry.category && `Category: ${inquiry.category}`,
    ].filter((line): line is string => Boolean(line));
    const message = inquiry.message ?? "(no message)";
    messages.push({
      senderAddress: config.sender,
      recipients: { to: [{ address: config.internalRecipient }] },
      replyTo: [{ address: inquiry.email, displayName: inquiry.name }],
      content: {
        subject: `New inquiry ${referenceNumber} from ${inquiry.business}`,
        plainText: `${details.join("\n")}\n\n${message}\n`,
        html: `<p>${details.map(escapeHtml).join("<br>")}</p><p style="white-space:pre-wrap">${escapeHtml(message)}</p>`,
      },
    });
  }
  return messages;
}

/** Sends the customer receipt and internal notification. Never throws. */
export async function sendInquiryEmails(referenceNumber: string, inquiry: NewInquiry) {
  const config = getEmailConfig();
  if (!config) {
    console.info(`[inquiries] Email not configured; skipping notifications for ${referenceNumber}`);
    return;
  }
  await sendEmails(config.connectionString, buildInquiryEmails(referenceNumber, inquiry, config), referenceNumber);
}
